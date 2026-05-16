const { chromium } = require("playwright");
const fs = require("fs");

const URL =
  "https://smap.sookmyung.ac.kr:8443/sap/bc/webdynpro/sap/zcmw2237?sap-language=KO#";

async function scrapeDepartment(page, deptName) {
  console.log(`[${deptName}] 스크래핑 시작...`);

  const cbCount = await page.evaluate(
    () => document.querySelectorAll('[ct="CB"]').length,
  );
  console.log(`드롭다운 개수: ${cbCount}`);

  await page.evaluate(() => {
    const dropdowns = Array.from(document.querySelectorAll('[ct="CB"]'));
    dropdowns[4].click();
  });
  await page.waitForTimeout(2000); // 2초로 늘림

  const found = await page.evaluate((dept) => {
    const allLibP = document.querySelectorAll('[ct="LIB_P"]');
    const lastLibP = allLibP[allLibP.length - 1];
    if (!lastLibP) return false;
    const options = lastLibP.querySelectorAll('[ct="LIB_I"]');
    const target = Array.from(options).find(
      (el) => el.innerText.trim() === dept,
    );
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, deptName);

  if (!found) {
    console.log(`[${deptName}] 학과 없음`);
    return [];
  }

  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[ct="B"]'));
    const searchBtn = btns.find((el) => el.innerText.trim() === "검색");
    if (searchBtn) searchBtn.click();
  });
  await page.waitForTimeout(3000);

  const courses = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll("td.urSTC")).map((td) =>
      td.innerText.trim(),
    );
    const result = [];
    const courseTypes = [
      "대면",
      "원격(사이버)",
      "원격(사이버+대면)",
      "원격(사이버+실습)",
      "혼합",
    ];

    let i = 0;
    while (i < cells.length) {
      if (courseTypes.includes(cells[i])) {
        result.push({
          name: cells[i + 1],
          category: cells[i + 6],
          time: cells[i + 7],
          professor: cells[i + 8],
          year: cells[i + 9],
          credit: cells[i + 10],
          note: cells[i + 24],
        });
        i += 27;
      } else {
        i++;
      }
    }
    return result;
  });

  console.log(`[${deptName}] ${courses.length}개 수집`);
  return courses;
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1000);

  const hasError = await page.evaluate(() => {
    return (
      document.title.includes("500") ||
      document.body.innerText.includes("SAP Internal Server Error")
    );
  });

  if (hasError) {
    console.log("SAP 오류 감지, 새로고침...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
  }

  console.log("페이지 로드 완료");
  await page.waitForTimeout(2000);

  const tab = page
    .locator(".lsTbsv5-ItemTitle", { hasText: "학과 / 전공" })
    .first();
  await tab.click({ timeout: 60000 });
  await page.waitForTimeout(5000);

  const deptName = "경영학부";
  const courses = await scrapeDepartment(page, deptName);

  const result = {
    [deptName]: {
      updated_at: new Date().toISOString(),
      courses,
    },
  };

  if (!fs.existsSync("./data")) fs.mkdirSync("./data");
  fs.writeFileSync(
    `./data/${deptName}.json`,
    JSON.stringify(result, null, 2),
    "utf-8",
  );
  console.log(`저장 완료: ./data/${deptName}.json`);

  await browser.close();
}

main().catch(console.error);
