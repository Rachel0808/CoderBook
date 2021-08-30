const fs = require("fs");
const path = require("path");
const execSync = require("child_process").execSync;

const args = process.argv.slice(2);

const projectFolder = args[0];
const redux = args[1];

if (!fs.existsSync(projectFolder)) {
  fs.mkdirSync(projectFolder);
}
process.chdir(`${projectFolder}`);

function executeCommandLine(commands) {
  commands.forEach((command) => {
    try {
      console.log("Command: ", command);
      const result = execSync(command, { studio: "inherit", shell: true });
      console.log(!result ? "Done" : result);
    } catch (error) {
      console.log(error);
    }
  });
}

// function createReactApp() {
//   const commands = 
// }
