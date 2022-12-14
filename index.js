const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = "https://karls.vyble.io/admin";
const LOGIN = "/login/?next=/admin/";
const DOCS = "/companymanagement/positiondocument"
const MAX_PAGES = 333;

async function login(username, password) {
  const csrfmiddlewaretoken = await getCsrf();
  return rp({
    method: 'POST',
    uri: BASE_URL + LOGIN,
    followAllRedirects: true,
    jar: true,
    headers: {
      referer: BASE_URL + LOGIN
    },
    formData: {
      username,
      password,
      csrfmiddlewaretoken,
      next: "/admin/"
    }
  })
}

async function download(link) {
  return await rp({
    method: 'GET',
    uri: link,
    encoding: "binary",
  });
}

async function getCsrf() {
  const body = await rp({
    method: 'GET',
    jar: true,
    uri: BASE_URL + LOGIN
  });
  const $ = cheerio.load(body);
  const csrf = $('input[name="csrfmiddlewaretoken"]').attr('value');
  console.log("FOUND csrf: ", csrf);
  return csrf;
}

async function goToPage(page){
  return rp({
    method: 'GET',
    jar: true,
    uri: BASE_URL + DOCS + "?p=" + page
  });
}

async function main() {
  console.log("Schoko hat die größte 🍌")
  if (process.argv.length !== 4) {
    console.error(`You need to run node index.js <user> <password>!`);
    return;
  }
  const username = process.argv[2];
  const password = process.argv[3];
  try{
    await login(username, password);

    for(let page=0; page<=MAX_PAGES; page++){
      console.log(`Gehe zur Seite ${page}`);
      const pageBody = await goToPage(page);
      const $ = cheerio.load(pageBody);
      const links = $('td.field-file > a').map((_, l) =>
        ({link: $(l).attr('href'), name: $(l).text()})
      );

      for(let l of links){
        console.log(`Downloading ${l.name}...`);
        const content = await download(l.link);
        fs.writeFileSync('./downloads/' + l.name, content);
      }
    }
  } catch(e){
    console.log("OH NOES.. SOMETHING WENT WRONG...");
    console.log(e);
  }
  console.log("FERTIG")
}
main()