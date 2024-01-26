const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
app.use(express.static(__dirname));

var folder = [];
{
  const directoryPath = path.join(__dirname, "groups");
  folder = fs.readdirSync(directoryPath);
}
//Гет запрос на главную страницу
app.get("/main", async (req, res) => {
  let str = "";
  let promises = [];
  for (let i = 0; i < folder.length; ++i) {
    let video = new Video(folder[i]);
    promises.push(
      video.get_connected().then(() => {
        str += `
            <div class="nameGroup">
              <a href="videos/${folder[i]}">
                <p>${folder[i]}</p>
              </a>
            </div>
            <div class="videos">`;
        for (let j = 0; j < video.img.length; ++j) {
          str += ` <div class="grid-3">
                <a class="thumb" href="videos/${folder[i]}\\#${j}">
                  <img class="thumb-img" src="img/${video.img[j]}" />
                  <div class="thumb-anim">
                    <h1 class="thumb-title">${video.header[j]}</h1>
                    <p class="thumb-description style="font-size:7pt}">${video.desc[j]}</p>
                  </div>
                </a>
              </div>`;
        }
        str += `</div>`;
      })
    );
  }
  await Promise.all(promises);
  let data_str = String(await fs.promises.readFile("main.html"));
  data_str = data_str.replace("{default}", str);
  res.end(data_str);
});

//Создание слушателей для всех остальных страниц
app.get(`/videos/:param*`, async (req, res) => {
  for (let i = 0; i < folder.length; ++i) {
    if (req.params.param == folder[i]) {
      let video = new Video(folder[i]);
      let str = await video.create_video_tags();
      let data_str = String(await fs.promises.readFile("video.html"));
      data_str = data_str.replace("{video}", str).replace("{group}", folder[i]);
      res.send(data_str);
    }
  }
});
//
app.get("/download/:group/:id", async (req, res) => {
  const path = `groups/${req.params.group}/${req.params.id}.mp4`;
  try {
    const stat = await fs.promises.stat(path);

    const fileSize = stat.size;
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    const stream = fs.createReadStream(path, { highWaterMark: 128 * 1024 });
    stream.pipe(res);
  } catch {
    res.end("no such file");
  }
});
/*app.post(
  "/",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "img", maxCount: 1 },
  ]),
  (req, res) => {
    console.log(req.body);
    let desc = req.body.desc;
    let name = req.body.header;
    let video = req.files["video"][0];
    let img = req.files["img"][0];
    let info = JSON.parse(req.body.info);
    //Добавление в JSON
    fs.readFile("data\\video-data.json", "utf8", (err, data) => {
      if (err) throw err;
      let json = JSON.parse(data);

      // Добавляем новый объект
      json[info.group][info.num + ""] = {
        name: name,
        desc: desc,
      };

      fs.writeFile(
        "data\\video-data.json",
        JSON.stringify(json, null, 2),
        (err) => {
          if (err) throw err;
          console.log("JSON file has been updated");
        }
      );
    });

    fs.writeFile(
      path.join(__dirname, "src", info.group + info.num),
      img.buffer,
      (err) => {
        if (err) throw err;
      }
    );

    fs.writeFile(
      path.join(__dirname, "group\\" + info.group, info.num),
      video.buffer,
      (err) => {
        if (err) throw err;
      }
    );

    console.log("Данные успешно получены!");
  }
);*/

const parser = express.json();
app.use(parser);
let id = -2;
let enter_id = 0;

app.get("/log.html", (req, res) => {
  res.sendFile(__dirname + "/reg/log.html");
});
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/reg/ind.html");
});
app.post("/", (req, res) => {
  enter_id = 0;
  let check = false;
  let { login, password, email } = req.body.user;
  id++;
  fs.readFile("data/user.json", "utf8", (err, data) => {
    if (err) {
      return res.sendStatus(500);
    }
    let users = JSON.parse(data);
    for (let user in users) {
      if (users[user].login === login || users[user].email === email) {
        check = true;
        break;
      }
      id = users[user].id;
    }
    if (!check) {
      try {
        var ob = {},
          ob1 = {};
        id++;
        ob["id"] = String(id);
        ob["login"] = login;
        ob["password"] = password;
        ob["email"] = email;
        ob1[String("user" + id)] = ob;
        let updatedData =
          data.slice(0, -1) + "," + JSON.stringify(ob1).slice(1);
        fs.writeFile("data/user.json", updatedData, "utf8", function (err) {});
        enter_id = id;
      } catch (err) {
        return res.sendStatus(500);
      }
    }
  });
});
app.get("/user/change/:id", (req, res) => {
  res.sendFile(__dirname + "/reg/put.html");
});
app.put("/user/change/:id", (req, res) => {
  fs.readFile("data/user.json", "utf8", (err, data) => {
    if (err) {
      return res.sendStatus(500);
    }
    let users = JSON.parse(data);
    let id = req.params.id;
    for (let user in users) {
      if (users[user].id === id) {
        Object.assign(users[user], req.body);
        break;
      }
    }
    fs.writeFile("data/user.json", JSON.stringify(users), (err) => {
      if (err) {
        console.error(err);
        return res.sendStatus(500);
      }

      res.sendStatus(200);
    });
  });
});
app.get("/user/delete/:id", (req, res) => {
  res.sendFile(__dirname + "/reg/delete.html");
});
app.delete("/user/delete/:id", (req, res) => {
  fs.readFile("data/user.json", "utf8", (err, data) => {
    if (err) {
      return res.sendStatus(500);
    }
    let users = JSON.parse(data);
    let id = req.params.id;
    for (let user in users) {
      if (users[user].id === id) {
        delete users[user];
        break;
      }
    }
    fs.writeFile("data/user.json", JSON.stringify(users), (err) => {
      if (err) {
        return res.sendStatus(500);
      }
      res.sendStatus(200);
    });
  });
});
app.get("/user/profile/:id", (req, res) => {
  fs.readFile("data/user.json", (err, data) => {
    if (err) {
      res.status(500).send("Server error");
    } else {
      let users = JSON.parse(data);
      for (let user in users) {
        if (users[user].id === req.params.id) {
          res.sendFile(__dirname + "/reg/user.html");
        }
      }
    }
  });
});
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/reg/log.html");
});
app.post("/login", (req, res) => {
  enter_id = 0;
  let { login, password } = req.body.user;
  let check = false;
  let data = fs.readFileSync("data/user.json", "utf-8");
  let users = JSON.parse(data);
  for (let user in users) {
    if (users[user].login + users[user].password === login + password) {
      check = true;
      enter_id = users[user].id;
      break;
    }
  }
  if (!check) {
    res.send("Wrong login or password");
  }
});
app.get("/user/redirection", (req, res) => {
  res.redirect("/user/profile/" + enter_id);
});
app.listen(3000, () => {
  console.log('Start listening')
});

class Video {
  fold;
  img = [];
  header = [];
  desc = [];
  constructor(fold) {
    this.fold = fold;
  }

  async create_video_tags() {
    let str = "";
    let files = await fs.promises.readdir(__dirname + "\\groups\\" + this.fold);
    let video = new Video(this.fold);
    await video.get_connected();
    for (let i = 0; i < files.length; ++i) {
      str += `<div class="header">${video.header[i]}</div>
      <div class="wrap">
        <div id="bar-${i}" class="bar"></div>
        <img id="img-${i}" src="http://localhost:3000/img/${
        video.img[i]
      }" onclick="loadVideo(id)"/>
        <video id=${i} controls style="display: none">
          <source src="http://localhost:3000/download/${this.fold}/${
        i + 1
      }" type="video/mp4" />
        </video>
      </div>`;
    }
    return str;
  }
  async get_connected() {
    let data = await fs.promises.readFile("data\\video-data.json");
    let jsonData = JSON.parse(data);
    jsonData = jsonData[`${[this.fold]}`];
    for (let i = 0; i < jsonData.length; ++i) {
      this.img.push(jsonData[i].img);
      this.desc.push(jsonData[i].desc);
      this.header.push(jsonData[i].name);
    }
  }
}
