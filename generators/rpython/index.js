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
    const hook = "### yeoman hook ###";
    let newFile = null;
    const insert = `  ${route.slugName}:\n` +
        `    handler: ${route.slugName}.handler\n` +
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


/**
 * Java Subgenerator
 */
const serverGenerator = generators.Base.extend({

    writing: {

        routes() {

            const root = ".";

            const dstRoot = ".";

            // We get the serverless.yml file as a string
            const path = this.destinationPath(`${dstRoot}/serverless.yml`);
            let file = fileReader.readFileAsString(path);

            const initFile = this.destinationPath(`${dstRoot}/__init__.py`);
            if (!this.fs.exists(initFile)) {
                this.fs.copyTpl(
                    this.templatePath(`${root}/__init__.py`),
                    this.destinationPath(`${dstRoot}/__init__.py`), {}
                );
            }

            // We process each route
            this.options.routes.forEach((route) => {
                // We check the route doesn"t already exists
                if (this.fs.exists(this.destinationPath(`${dstRoot}/${route.pascalName}.py`))) {
                    this.log(`Route exists, ${route.slugName}.py already exists!`);
                    return;
                }


                this.fs.copyTpl(
                    this.templatePath(`${root}/handler.py`),
                    this.destinationPath(`${dstRoot}/${route.slugName}.py`), {}
                );

                //events
                this.fs.copyTpl(
                    this.templatePath(`${root}/event.json`),
                    this.destinationPath(`${dstRoot}/event_${route.slugName}.json`)
                );

                file = updateYamlFile(route, file);

            });

            // rewrite the serverless.yml
            this.write(path, file);


        },
    },
    sls2sam() {
        if (!this.options.__app) {

            // this.spawnCommand("sls", ["sam", "export", " --output", "template.yml"]);
        }
    }
});

module.exports = serverGenerator;
