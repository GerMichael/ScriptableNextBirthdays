/**
 * Author: Michael Gerischer
 * GitHub: https://github.com/GerMichael/ScriptableNextBirththdays
 */
const version = "1.1.0";

// === Script controlled variables ===
// === DO NOT ALTER VARIABLE NAMES ===

const backgroundColor = "#1D3557";
const widgetTitle = "🎁 Next Birthdays 🎁";

// ===================================







// === Script Settings – Be careful! ===

const settings = {
  // title text: string
  title: widgetTitle,
  // alignment of title: "center", "right", "left"
  titleAlignment: "center",
  // the palette name defining the color values
  paletteName: "noble",
  // The actual color name picked from the selected palette
  backgroundColor,
  // font family
  textFontFamilies: {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    light: "Helvetica-Light",
  },
  // Used to indicate text overflow
  textOverflowChar: "…",
  // replace certain date differences, e.g. if the birthday is today (=0) a special birthday char can be displayed instead
  dateReplacements: {
    0: "🎉",
  },
  // The units for the date difference
  dayUnit: {
    // either an array [1 day, rest] or string for everything
    default: "d",
  },
  // Text size of title: number
  titleSize: {
    small: 12,
    medium: 18,
    default: 26,
  },
  // spacing between text columns
  textColumnSpacing: {
    small: 4,
    default: 10,
  },
  // the spacing size relative to the text/title size (0.3 = 0.3 * text size)
  verticalTextSpacing: {
    small: 0.7,
    medium: 0.3,
    default: 0.7,
  },
  // Number of displayed contacts for widget sizes
  numberOfContactsForWidgetSize: {
    small: 6,
    medium: 5,
    default: 8,
  },
  // left, right, top, bottom padding of widget: number
  widgetPadding: {
    small: 3,
    medium: 7,
    default: 10,
  },
}

// == End of script settings ==





// Tooling
const TODAY = new Date();

function l0(num, places = 2){
  return String(num).padStart(places, '0')
}

function dayStart(date){
  const dateCopy = new Date(date);
  dateCopy.setHours(0);
  dateCopy.setMinutes(0);
  dateCopy.setSeconds(0);
  dateCopy.setMilliseconds(0);
  return dateCopy;
}

function setNextExecution(widget) {
  const today = dayStart(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  widget.refreshAfterDate = tomorrow;
}


function getValueForWidgetType(obj, defaultValue) {
  if(config.widgetFamily in obj){
    return obj[config.widgetFamily];
  } else if("default" in obj){
    return obj.default;
  } else {
    defaultValue;
  }
}






// File Handling
class NoCacheFileError extends Error {
  constructor(path){
    super(`The cache file ${path} does not exist!`);
    this.path = path;
  }
}

let fm = FileManager.local();

if(fm.isFileStoredIniCloud(module.filename)){
  fm = FileManager.iCloud();
}

const workingDir = fm.documentsDirectory();
const contactsCacheFileName = "__nextBirthdays.cache";
const contactsCacheFile = fm.joinPath(workingDir, contactsCacheFileName);






// Data Handling
async function updateAndGetCache(fm) {
  const allData = await computeBirthdays();
      
  fm.writeString(contactsCacheFile, JSON.stringify(allData));
  
  return allData;
}

async function computeBirthdays() {
  const allContactContainers = await ContactsContainer.all();
  
  log(`Found contact containers: [${allContactContainers.map(c => c.name)}]`);
  
  let contacts;
  
  contacts = await Contact.all(allContactContainers);
  
  log(`Number of found contacts: ${contacts.length}`);
  
  contacts = contacts.filter(c => c.birthday != null);
  
  contacts = contacts.map(c => {
    const { 
      familyName, givenName, birthday
    } = c;
    return {
      familyName, givenName, birthday: dayStart(birthday) 
    }
  });
  
  // Sort them
  contacts = contacts.sort((c1, c2) => {
      const bday1 = normalizeDate(c1.birthday);
      const bday2 = normalizeDate(c2.birthday);
      return bday1 > bday2 ? 1 : bday1 === bday2 ? 0 : -1;
  });
  
  // only unique
  contacts = Array.from(
    new Map(
      contacts.map(c => ([`${String(c.familyName)}.${String(c.givenName)}.${String(c.birthday)}`, c]))
    ).values()
  );
  
  log(`Number of unique contacts with birthday: ${contacts.length}`);
  
  return contacts;
}

function simpleDate(date){
  return `${date.getFullYear()}.${l0(date.getMonth() + 1)}.${l0(date.getDate())}`;
}

function loadCache(fm) {
  if(!fm.fileExists(contactsCacheFile)){
    throw new NoCacheFileError(contactsCacheFile);
  }
  const contacts = JSON.parse(fm.readString(contactsCacheFile));
  return contacts.map(c => ({...c, birthday: new Date(c.birthday) }));
}

function computeNextBirthdays(persons, settings){
  
  let numOfContacts = getValueForWidgetType(settings.numberOfContactsForWidgetSize, 8);
  
  const today = normalizeDate(TODAY);
  
  // If last item is before today, start in the new year again
  if(today > normalizeDate(persons[persons.length - 1].birthday)){
    getNextEntries(0, numOfContacts, persons);
  }
  
  // Binary search of the next birthday
  let start = 0;
  let end = persons.length - 1;
  let i;

  while (start < end) {
    i = Math.floor((end - start) / 2 + start);
    const bday = normalizeDate(persons[i].birthday);
    const person = persons[i];

    if(bday < today){
      start = i + 1; 
    } else {
      end = i;
    }
  }
  
  // adding people's birthday of the "next" year, if there are too few for "this" year
  const personsIgnoringEndOfYear = start + numOfContacts < persons.length ? persons : [...persons, ...persons.slice(0, end)];
  return getNextEntries(start, numOfContacts, personsIgnoringEndOfYear);
}

function getNextEntries(start, count, array){
  return array.slice(start, start + count);
}

function normalizeDate(dateAsPossiblyString){
  let date = dateAsPossiblyString;
  if(typeof dateAsPossiblyString === "string") {
    date = new Date(dateAsPossiblyString);
  }
  
  return `${l0(date.getMonth() + 1)}.${l0(date.getDate())}`;
}

function nextContactsAndRelativeDates(contacts){
  const today = dayStart(TODAY);
  return contacts.map(c => ({...c, dateDiff: computeDateDiff(today, c.birthday), age: computeYearsDiff(today, c.birthday)}));
}

function computeDateDiff(today, date){
  const dateCopy = new Date(date);
  dateCopy.setFullYear(today.getFullYear());
  return Math.ceil((dateCopy - today) / (24 * 60 * 60 * 1000));
}

function computeYearsDiff(today, date){
  return today.getFullYear() - date.getFullYear();
}






// Widget Composition
class TextLength {

  static getTextWidth = `
  function getTextWidth(text, font) {
    // re-use canvas object for better performance
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    if(Array.isArray(text)){
      return text.map(t => context.measureText(t).width);
    }
    return context.measureText(text).width;
  }
 `;

  static getMaxTextWidth = `
  function getTextWithMaxWidth(maxWidth, overflowChar, text, font){
    if(getTextWidth(text, font) < maxWidth){
      return text;
    }
    let trimmedText = "";
    for(let i = 0; i < text.length; i++){
      const newTrimmedText = trimmedText + text.charAt(i);
      if (getTextWidth(newTrimmedText + overflowChar, font) < maxWidth){
        trimmedText = newTrimmedText;
      } else {
        return trimmedText.trim() + overflowChar;
      }
    }
  }
`;

  constructor() {
    this.webView = new WebView();
    this.webView.loadHTML("<html></html>");
  }
  
  async computeLength(text, fontSize, fontFamily = "Helvetica", fontWeight = ""){
    const font = `"${fontWeight} ${fontSize}px ${fontFamily}"`;
    const inputText = Array.isArray(text) ? `['${text.join("','")}']` : `'${text}'`;
    return await this.webView.evaluateJavaScript(`
      ${TextLength.getTextWidth}

      getTextWidth(${inputText}, ${font});
`, false);
  }
  
  async getTextWithMaxLength(maxLength, overflowChar, text, fontSize, fontFamily = "Helvetica", fontWeight = ""){
    const font = `"${fontWeight} ${fontSize}px ${fontFamily}"`;
    const inputText = Array.isArray(text) ? `['${text.join("','")}']` : `'${text}'`;
    return await this.webView.evaluateJavaScript(`
      ${TextLength.getTextWidth}
      
      ${TextLength.getMaxTextWidth}
      
      if(Array.isArray(${inputText})){
        ${inputText}.map(t => getTextWithMaxWidth(${maxLength}, '${overflowChar}', t, ${font}));
      } else {
        getTextWithMaxWidth(${maxLength}, '${overflowChar}', ${inputText}, ${font});
      }
`, false);
  }
}

const textLength = new TextLength();
const lightDotsLength = await textLength.computeLength(settings.textOverflowChar, settings.textSize, settings.textFontFamilies.thin)

async function computeWidget(fm, settings){
  const widget = new ListWidget();
  const recomputeBirthdays = !config.runsInWidget;
  
  const allData = recomputeBirthdays ? await updateAndGetCache(fm) : loadCache(fm);
  
  let nextContacts;
  nextContacts = computeNextBirthdays(allData, settings);
  
  nextContacts = nextContactsAndRelativeDates(nextContacts);
  
  await composeWidget(widget, nextContacts, settings);
  return widget;
}

async function composeWidget(widget, contacts, settings) {
  
  const { verticalSpacing, titleSize, titleSpacing, textSize, textSpacing, canvasSize, padding } = computeSizes(contacts.length, settings);

  // Padding is handled by text renderer
  widget.setPadding(...padding);
  
  const bgColor = new Color(settings.backgroundColor);
  widget.backgroundColor = bgColor;
  console.log(bgColor)
  
  const textColor = isDark(settings.backgroundColor) ? Color.white() : Color.black();
  renderTitle(widget, titleSize, settings.title, textColor);
  
  await renderNextBirthdays(contacts, widget, canvasSize, titleSpacing, textSize, textSpacing, textColor);
  
  return widget;
}

function computeSizes(numContacts, settings){
  const padRaw = getValueForWidgetType(settings.widgetPadding, 10);
  const verticalSpacing = getValueForWidgetType(settings.verticalTextSpacing, 0.5);
  const titleSize = getValueForWidgetType(settings.titleSize, 26);
  const titleSpacing = titleSize * verticalSpacing;

  const padding = [padRaw - titleSize * .25, padRaw, 0, padRaw];
  
  const canvasSize = getCanvasSize(padding[0], padding[1], verticalSpacing, titleSize)

  const textSize = (canvasSize.y - padding[3] - titleSpacing) / (numContacts + (numContacts - 1) * verticalSpacing)
  const textSpacing = textSize * verticalSpacing;

  return { verticalSpacing, titleSize, titleSpacing, textSize, textSpacing, canvasSize, padding }
}

function displayWidget(widget){
  widget.presentLarge();
}

function renderTitle(widget, titleSize, title, titleColor){
  const titleElement = widget.addText(title);
  
  titleElement.font = new Font(settings.textFontFamilies.regular, titleSize);
  titleElement.textColor = titleColor;
  switch(settings.titleAlignment){
    case "right": 
      titleElement.rightAlignText(); break;
    case "left":
      titleElement.leftAlignText(); break;
    case "center":
    default:
      titleElement.centerAlignText();
  }
}

function getCanvasSize(paddingTop, paddingX, verticalSpacing, titleSize){
  let canvasSize = [];
  
  switch(config.widgetFamily){
    case "extraLarge":
      canvasSize = {x: 801, y: 376};
      break;      
    case "small":
      canvasSize = {x: 169, y: 169};
      break;
    case "medium":
      canvasSize = {x: 360, y: 169};
      break;
    case "large":
    default:
      canvasSize = {x: 360, y: 376};
  }

  return normalizeCanvasSize(canvasSize, paddingTop, paddingX, verticalSpacing, titleSize);
}

function normalizeCanvasSize(canvasSize, paddingTop, paddingX, verticalSpacing, titleSize) {
  
  return {
    x: canvasSize.x - paddingX * 2, 
    y: canvasSize.y - titleSize * 2 - paddingTop,
  }
}

async function renderNextBirthdays(contacts, widget, canvasSize, titleSpacing, textSize, textSpacing, textColor) {
  const canvas = new DrawContext();
  canvas.respectScreenScale = true;
  canvas.opaque = false;
  canvas.size = new Size(canvasSize.x, canvasSize.y);
  canvas.setTextColor(textColor);

  const dayUnit = getValueForWidgetType(settings.dayUnit, "d")
  const untilDates = contacts.map(c => {
    if(c.dateDiff in settings.dateReplacements){
      return settings.dateReplacements[c.dateDiff];
    } else if(Array.isArray(dayUnit)) {
      let actualDayUnit = c.dateDiff === 1 ? dayUnit.at(0) : dayUnit.at(1);
      return `${c.dateDiff}${actualDayUnit}`;
    } else {
      return `${c.dateDiff}${dayUnit}`;
    }
  });
  const ages = contacts.map(c => `(${c.age})`);
  const names = contacts.map(c => `${c.givenName} ${c.familyName}`);
  
  const widths = await Promise.all(
    [untilDates, ages, names].map((texts, i) => 
      textLength.computeLength(
        texts, 
        textSize,
        i === 0 ? settings.textFontFamilies.bold : settings.textFontFamilies.light,
      )
    )
  );
  const [untilDateWidths, ageWidths, nameWidths] = widths;
  
  const [untilDateMaxWidth, agesMaxWidth] = widths.map(w => w.slice().sort().at(-1));
  
  const columnSpacing = getValueForWidgetType(settings.textColumnSpacing, 10);
  const untilDatesX = 0;
  const agesX = untilDateMaxWidth + columnSpacing;
  const namesX = agesX + agesMaxWidth + columnSpacing;
  const namesMaxWidth = canvasSize.x - namesX;
  
  const trimmedNames = await textLength.getTextWithMaxLength(namesMaxWidth, settings.textOverflowChar, names, textSize, settings.textFontFamilies.light);
  
  const boldFont = new Font(settings.textFontFamilies.bold, textSize);
  const lightFont = new Font(settings.textFontFamilies.light, textSize);
  
  for(let i = 0; i < contacts.length; i++){
    const y = i * (textSize + textSpacing) + titleSpacing;
    const height = textSize + textSpacing;
    
    canvas.setTextAlignedRight();
    canvas.setFont(boldFont);
    canvas.drawTextInRect(untilDates[i], new Rect(untilDatesX, y, untilDateMaxWidth + 1, height));
    
    canvas.setTextAlignedCenter();
    canvas.setFont(lightFont);
    canvas.drawTextInRect(ages[i], new Rect(agesX, y, agesMaxWidth + 1, height));
    
    canvas.setTextAlignedLeft();
    canvas.drawTextInRect(trimmedNames[i], new Rect(namesX, y, namesMaxWidth + 1, height));
  }
  
  const img = widget.addImage(canvas.getImage());
  img.centerAlignImage()
}





// Error handling
function setupErrorWidget(widget, error){
  let text;
  if (error instanceof NoCacheFileError){
    text = widget.addText(`🏗 There is one last thing…
Please run this script once in the Scriptable app by clicking the „${Script.name()}“-tile.
Thanks! 🙏`);
  text.textColor = Color.yellow();
  } else {
    text = widget.addText("🫣 Unexpected error: " + (error instanceof Error ? error.message : String(error)));
  text.textColor = Color.red();
  }
  text.centerAlignText();
  if(config.widgetFamily === "small"){
    text.font = Font.regularSystemFont(10);
  }
}









// Background Color

function applyColorToScript(color){
  const scriptContent = getScript();
  const scriptWithNewColor = scriptContent.replace(/((?:const|let|var) *backgroundColor *= *[`'"])((?:#[0-9A-Fa-f]{6})?)([`'"])/, `$1${color}$3`);
  updateScript(scriptWithNewColor);
}

// Custom
async function setCustomBackgroundColor(){
  const colorRegex = /^#[0-9A-Fa-f]{6}$/;
  
  let result = 0;
  let isValid = null;
  let normalizedColorValue;
  while(!isValid && result > -1){
    const inputAlert = new Alert();
    inputAlert.message = `${isValid === false ? "Wrong color value! " : ""}Type in your custom hexadecimal 6-digit color value (e.g., #FA0407)`;
    inputAlert.addAction("Validate and set color");
    const textfield = inputAlert.addTextField("Your custom color", "");
    inputAlert.addCancelAction("Cancel");
    result = await inputAlert.present();
    
    normalizedColorValue = textfield.text.trim().replace(/^([^#])/, "#$1");
    if(colorRegex.test(normalizedColorValue)){
      isValid = true;
      break;
    }
    textfield.text = normalizedColorValue;
  }
  if(normalizedColorValue !== ""){
    applyColorToScript(normalizedColorValue);
  }
}

// Choose from palettes
async function setBackgroundColor(){
  const selectedColor = await selectColor(getPalettes());
  if(selectedColor == null){
    console.log(`No color was selected.`)
    return;
  }
  console.log(`Selected color: ${selectedColor}.`)
  applyColorToScript(selectedColor)
}

// copied from https://24ways.org/2010/calculating-color-contrast
function isDark(hexcolor){
  const r = parseInt(hexcolor.substring(1,3),16);
  const g = parseInt(hexcolor.substring(3,5),16);
  const b = parseInt(hexcolor.substring(5,7),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return yiq < 128;
}

async function selectColor(palettes){
  let selectedColor = null;
  const table = new UITable();
  table.showSeparators = false;
  
  let index = 0;
  for(let paletteName of Object.keys(palettes)){
  if(index++ > 0){
    const spacer = new UITableRow();
    table.addRow(spacer)
  }
    
    const paletteNameRow = new UITableRow();
    const paletteNameCell = paletteNameRow.addText(paletteName.toUpperCase());
    paletteNameCell.titleFont = Font.blackSystemFont(20);
    table.addRow(paletteNameRow);
    
    const palette = palettes[paletteName];
    for(let color of Object.keys(palette)){
      const colorValue = palette[color];
      const colorRow = new UITableRow();
      colorRow.dismissOnSelect = true;
      colorRow.onSelect = () => selectedColor = colorValue;
      colorRow.backgroundColor = new Color(colorValue);
      const colorDescription = colorRow.addText(color.toLowerCase(), colorValue.toUpperCase());
      const textColor = isDark(colorValue) ? Color.white() : Color.black();
      colorDescription.titleColor = textColor;
      colorDescription.subtitleColor = textColor;
      table.addRow(colorRow);
    }
  }
  
  await table.present(false);
  return selectedColor;
}

function getPalettes() {
  return {
      "main": {
        "yellow": "#FFD60A",
        "orange": "#FF8B34",
        "red": "#D21034",
        "pink": "#FDBBE1",
        "purple": "#C019FF",
        "blue": "#4163B1",
        "green": "#006233",
        "black": "#000000",
        "white": "#FFFFFF",
        "gray": "#AAAAAA"
    },
    "noble": {
        "yellow": "#FFC300",
        "orange": "#fb8500",
        "red": "#d62828",
        "pink": "#FF5D8F",
        "purple": "#5A189A",
        "blue": "#1D3557",
        "green": "#006466",
        "black": "#000814",
        "white": "#edf2f4",
        "gray": "#8d99ae"
    },
    "dark": {
        "red": "#660606",
        "pink": "#966289",
        "purple": "#62106A",
        "blue": "#1A174D",
        "green": "#0C3220",
        "black": "#000000",
        "gray": "#383838"
    },
    "smooth": {
        "yellow": "#FDFF47",
        "orange": "#FFAF54",
        "red": "#FF7878",
        "pink": "#EAABF3",
        "purple": "#E279AE",
        "blue": "#89A1FF",
        "green": "#7ED6A8",
        "white": "#FFFFFF",
        "gray": "#D5DFDB"
    }
  };
}





// Widget Title Updating
async function setWidgetTitle(settings){
  const alert = new Alert();
  alert.message = "Adjust the widget title";
  const textfield = alert.addTextField("the new title", settings.title);
  alert.addAction("Set new widget title");
  alert.addCancelAction("Cancel");
  const result = await alert.present();
  
  if(result > -1){
    const trimmedTitle = normalizedColorValue = textfield.text.trim();
  
    const scriptContent = getScript();
    const scriptWithNewTitle = scriptContent.replace(/((?:const|let|var) *widgetTitle *= *[`'"])(.*)([`'"])/, `$1${trimmedTitle}$3`);
    updateScript(scriptWithNewTitle);
  }
}







// Script Updating
function getScriptPath(){
  return fm.joinPath(workingDir, Script.name() + ".js");
}
function getScript(){
  const scriptPath = getScriptPath();
  return fm.readString(scriptPath);
}

function updateScript(newScript){
  const scriptPath = getScriptPath();
  fm.writeString(scriptPath, newScript);
}







// User Actions
async function handleUserActions(settings){
  const alert = new Alert();
  alert.addAction("🎨 Choose Background Color");
  alert.addAction("🧑‍🎨 Set Custom Background Color");
  alert.addAction("💯 Adjust Widget Title");
  alert.addAction("👀 Display Widget");
  alert.addCancelAction("Close");
  alert.title = "What do you want to do?";
  const result = await alert.presentAlert();
  
  let actionIndex = 0;
  if(actionIndex++ === result){ 
    return await setBackgroundColor();
  } else if(actionIndex++ === result){
    return await setCustomBackgroundColor();
  } else if(actionIndex++ === result){
    return await setWidgetTitle(settings);
  } else if(actionIndex++ === result){
    return displayWidget(widget);
  }
}









// Main
try{
log(`Running script version ${version}`);
  const start = new Date();
  
  const widget = await computeWidget(fm, settings);

  Script.setWidget(widget);
  setNextExecution(widget);
  
  const end = new Date()
  log(`Widget update took ${end - start}ms.`)
  
  if(config.runsInApp){
    await handleUserActions(settings);
  }
  
} catch(e){
  console.error(e);
  const widget = new ListWidget();
  setupErrorWidget(widget, e);
  Script.setWidget(widget);
  setNextExecution(widget);
  if(config.runsInApp){
    throw e;
  }
} finally {
  Script.complete();
}
