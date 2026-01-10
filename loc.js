const fs = require("fs");
const path = require("path");

let locs = {};

fs.writeFileSync("./all.osl", "");

const countFile = (p) => {
    if (fs.lstatSync(p).isDirectory()) {
        if (!p.endsWith("build")) {
            const files = fs.readdirSync(p);
            for (let i = 0; i < files.length; i++) {
                countFile(path.join(p, files[i]));
            }
        }
    } else {
        const type = p.match(/\.(\w+)$/)[1];
        fs.appendFileSync("./all.osl", fs.readFileSync(p, "utf-8"), "utf-8");
        locs[type] = (locs[type] ?? 0) + fs.readFileSync(p, "utf-8").split("\n").length;
    }
}

countFile("./phosphorus");

console.log(locs);