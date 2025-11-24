const fs = require("fs");
const path = require("path");

const zip = JSON.parse(fs.readFileSync("phosphorus.json", "utf-8"));

function unzipFile(f, p) {
    if (!fs.existsSync(p))
        fs.mkdirSync(p);
    console.log(path.join(p, f[1] + f[0]));
    if (f[0] == ".folder") {
        fs.mkdirSync(path.join(p, f[1]));
        for (let i = 0; i < f[2].length; i++) {
            unzipFile(f[2][i], path.join(p, f[1]));
        }
    } else {
        fs.writeFileSync(path.join(p,`${f[1]}${f[0]}`), f[2]);
    }
}

fs.rmSync("./phosphorus", { recursive: true });

unzipFile(zip, "./");
