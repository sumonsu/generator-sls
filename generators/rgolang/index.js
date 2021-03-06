"use strict";

const generators = require("yeoman-generator");
const fileReader = require("html-wiring");

/**
 * Updates the serverless.yml file with the new routes
 * @param  {Object} route Object containing all the route names
 * @param  {String} file String representation of our file
 * @return {String} Our modified version of the input file
 */
function updateYamlFile(route, file) {
    //route.method => event
    const hook = "### yeoman hook ###";
    let newFile = null;
    const insert = `  ${route.slugName}:\n` +
        `    handler: bin/${route.slugName}\n` +
        "    events:\n" +
        "      - http:\n" +
        `          path: ${route.slugName}\n` +
        `          method: ${route.method}\n` +
        "          cors: true\n";

    // events:
    //     - schedule: cron(0/2 * ? * MON-FRI *)
    //every 2nd minute from Monday to Friday
    //rate(value unit) (minute minutes hour hours day days)
    //cron(Minutes Hours Day-of-month Month Day-of-week Year)
    //https://github.com/serverless/examples/tree/master/aws-node-scheduled-cron

    if (file.indexOf(insert) === -1) {
        newFile = file.replace(hook, insert + hook);
    }

    return newFile;
}

function updateMakeFile(route, file) {
    const hook = "### yeoman hook ###";
    let newFile = null;
    const insert = `	GOARCH=amd64 GOOS=linux go build -gcflags="-N -l" -o bin/${route.slugName} ${route.slugName}/main.go\n`;

    if (file.indexOf(insert) === -1) {
        newFile = file.replace(hook, insert + hook);
    }

    return newFile;
}


/**
 * The route subgenerator
 */
const serverGenerator = generators.Base.extend({
    prompting: {

        ask() {

            return this.prompt([{
                name: "unitTest",
                message: "Unit Test Framework to be used?",
                type: "list",
                choices: ["Testify", "Convey"]
            }]).then( (answers) => {
                this.unitTest = answers.unitTest;
            });
        }
    },
    writing: {

        routes() {

            // We get the serverless.yml file as a string
            const path = this.destinationPath("serverless.yml");
            let file = fileReader.readFileAsString(path);

            const makePath = this.destinationPath("Makefile");
            let makeFile = fileReader.readFileAsString(makePath);


            // We process each route
            this.options.routes.forEach((route) => {
                // We check the route doesn"t already exists
                if (this.fs.exists(this.destinationPath(`${route.slugName}/main.go`))) {
                    this.log(`Route ${route.slugName} already exists`);
                    return;
                }

                const root = ".";

                this.fs.copy(
                    this.templatePath(`${root}/main.go`),
                    this.destinationPath(`${route.slugName}/main.go`)
                );

                if (this.unitTest === "Testify") {
                    //unit test
                    this.fs.copyTpl(
                        this.templatePath(`${root}/main_test.go`),
                        this.destinationPath(`${route.slugName}/main_test.go`)
                    );
                } else {
                    //unit test
                    this.fs.copyTpl(
                        this.templatePath(`${root}/main_convey_test.go`),
                        this.destinationPath(`${route.slugName}/main_test.go`)
                    );
                }


                //events
                this.fs.copyTpl(
                    this.templatePath(`${root}/event.json`),
                    this.destinationPath(`${route.slugName}/event.json`)
                );

                file = updateYamlFile(route, file);
                makeFile = updateMakeFile(route, makeFile);


                this.fs.copyTpl(
                    this.templatePath(`${root}/Makefile`),
                    this.destinationPath(`${route.slugName}/Makefile`),
                    {
                        routeName: route.slugName
                    }
                );

            });

            // rewrite the serverless.yml
            this.write(path, file);

            //Makefile
            this.write(makePath, makeFile);
        },
    },
    sls2sam() {
        if (!this.options.__app) {
            //  this.spawnCommand("make")
            // this.spawnCommand("sls", ["sam", "export", " --output", "template.yml"]);
        }
    }
});

module.exports = serverGenerator;
