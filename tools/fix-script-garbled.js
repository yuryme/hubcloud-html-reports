const fs = require("fs");

const file = "script.js";
let src = fs.readFileSync(file, "utf8");

const replacements = new Map([
  ["РљР»РёРµРЅС‚", "Клиент"],
  ["РњР°СЂРєРµС‚С‹", "Маркеты"],
  ["Период не РІС‹бран", "Период не выбран"],
  ["Р”Р°С‚а РѕС‚С‡РµС‚а: ", "Дата отчета: "],
  ["НеС‚ РґаннС‹С… для РІС‹бранного периода", "Нет данных для выбранного периода"],
  ["С€С‚", "шт"],
  ["необС…одимо_С€С‚", "необходимо_шт"],
  ["колво_2_РёС‚ого", "колво_2_итого"],
  ["номенклаС‚ура_title", "номенклатура_title"],
  ["номенклаС‚ура_РІС…од_title", "номенклатура_вход_title"],
  ["номенклаС‚ура_РІС‹С…од_title", "номенклатура_выход_title"],
  ["вЏ·", "∑ "],
  ["   в”њ ", "   ├ "],
  ["РС‚ого", "Итого"],
  ["ПеС‡Р°С‚ь", "Печать"],
  ["Р—акрС‹С‚ь", "Закрыть"]
]);

let total = 0;
for (const [from, to] of replacements) {
  const count = src.split(from).length - 1;
  if (count > 0) {
    src = src.split(from).join(to);
    total += count;
  }
}

fs.writeFileSync(file, src, "utf8");
console.log(`replacements=${total}`);
