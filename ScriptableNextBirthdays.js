/**
 * Author: Michael Gerischer
 * GitHub: https://github.com/GerMichael/ScriptableNextBirththdays
 */
const version = "1.0.2";

// === User Settings – Edit here ===

// the hsv offset to compute the gradient. if the offset exceeds the limit, the value will be clamped, so no worries!
//   1. index: 0-360: the angle (red to yellow to green to … to red)
//   2. index: 0-1: saturation (e.g. white (0) to red (1))
//   3. index: 0-1: (blackish) value (e.g. black (0) to red (1))
const hsvGradientOffset = [-5,0,-.15];

const settings = {
  // title text: string
  title: "🎁 Next Birthdays 🎁",
  // alignment of title: "center", "right", "left"
  titleAlignment: "center",
  // the background: gradient(colorString) or monochrome(colorString)
  // The colorString can be either "black", "white" or a variation of "yellow", "orange", "red", "pink", "purple", "blue", "green" and "gray"
  // The variations are "light-[color]", "[color]" and "dark-[color]"
  colorTheme: gradient("dark-blue"),
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
// == Do Not Edit Anything Below ==






// Tooling
const TODAY = new Date();

let fm = FileManager.local();

if(fm.isFileStoredIniCloud(module.filename)){
  fm = FileManager.iCloud();
}


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

function getValueForWidgetType(obj, defaultValue) {
  if(config.widgetFamily in obj){
    return obj[config.widgetFamily];
  } else if("default" in obj){
    return obj.default;
  } else {
    defaultValue;
  }
}

class NoCacheFileError extends Error {
  constructor(path){
    super(`The cache file ${path} does not exist!`);
    this.path = path;
  }
}




// Script Settings
const workingDir = fm.documentsDirectory();
const contactsCacheFileName = "__nextBirthdays.cache";
const contactsCacheFile = fm.joinPath(workingDir, contactsCacheFileName);




// Main
try{
log(`Running script version ${version}`);
  const start = new Date();
  
  const widget = new ListWidget();
  const recomputeBirthdays = !config.runsInWidget;
  
  const allData = recomputeBirthdays ? await updateAndGetCache(fm) : loadCache(fm);
  
  let nextContacts;
  nextContacts = computeNextBirthdays(allData, settings);
  
  nextContacts = nextContactsAndRelativeDates(nextContacts);
  
  await composeWidget(widget, nextContacts, settings);
  
  displayAndHandleWidget(widget);
  setNextExecution(widget);
  
  const end = new Date()
  log(`Script took ${end - start}ms.`)
} catch(e){
  console.error(e);
  const widget = new ListWidget();
  setupErrorWidget(widget, e);
  displayAndHandleWidget(widget);
  // throw e;
} finally {
  Script.complete();
}





// Data Handling
async function updateAndGetCache(fm) {
  const allData = await computeBirthdays();
      
  fm.writeString(contactsCacheFile, JSON.stringify(allData));
  log(`Updated cache successfully: ${contactsCacheFile}`);
  
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






// UI Handling
async function composeWidget(widget, contacts, settings) {
  
  const { verticalSpacing, titleSize, titleSpacing, textSize, textSpacing, canvasSize, padding } = computeSizes(contacts.length, settings);

  // Padding is handled by text renderer
  widget.setPadding(...padding);
  
  if(settings.colorTheme.type === "gradient"){
    widget.backgroundGradient = settings.colorTheme.gradient;
  } else if(settings.colorTheme.type === "monochrome"){
    widget.backgroundColor = settings.colorTheme.color;
  }
  
  renderTitle(widget, titleSize, settings.title);
  
  await renderNextBirthdays(contacts, widget, canvasSize, titleSpacing, textSize, textSpacing, settings);
  
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

function displayAndHandleWidget(widget){
  Script.setWidget(widget);
  widget.presentLarge();
}

function renderTitle(widget, titleSize, title){
  const titleElement = widget.addText(title);
  
  titleElement.font = new Font(settings.textFontFamilies.regular, titleSize);
  titleElement.textColor = settings.colorTheme.textColor;
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

async function renderNextBirthdays(contacts, widget, canvasSize, titleSpacing, textSize, textSpacing) {
  const canvas = new DrawContext();
  canvas.respectScreenScale = true;
  canvas.opaque = false;
  canvas.size = new Size(canvasSize.x, canvasSize.y);
canvas.setTextColor(settings.colorTheme.textColor);

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







// Coloring

function clamp(value, min, max){
  return Math.min(Math.max(value, min), max);
}

// algorithm copied from https://en.m.wikipedia.org/wiki/HSL_and_HSV
function hsvToRgb(h,s,v){
  // chroma
  const c = v * s;
  const h1 = h / 60;
  const x = c * (1 - Math.abs(h1 % 2 - 1));
  const m = v - c;
  const [r1,g1,b1] = h1 < 1 ? [c,x,0] : 
                     h1 < 2 ? [x,c,0] :
                     h1 < 3 ? [0,c,x] :
                     h1 < 4 ? [0,x,c] :
                     h1 < 5 ? [x,0,c] :
                              [c,0,x];

  return [(r1+m)*255, (g1+m)*255, (b1+m)*255]
}

function rgbToHex(r1, g1, b1){
  const [r,g,b] = [r1, g1, b1].map(Math.round);
  const rr = r.toString(16).padStart(2, 0);
  const gg = g.toString(16).padStart(2, 0);
  const bb = b.toString(16).padStart(2, 0);

  return `#${rr}${gg}${bb}`;
}

function getTextColors(){
  const whiteTextColor = new Color("#FFF");
  const blackTextColor = new Color("#000");
  return { whiteTextColor, blackTextColor };
}

function gradient(colorString, bottomColorOffset = hsvGradientOffset){
  const gradient = new LinearGradient();
  gradient.locations = [.4,1];
  
  const {color: hsvBody, textColor} = getBaseHsvAndTextColor(colorString);

  const bottomHsvAngle = (hsvBody[0] + bottomColorOffset[0]) % 360;
  const hsvBottom = [
    bottomHsvAngle < 0 ? 360 + bottomHsvAngle : bottomHsvAngle,
    clamp(hsvBody[1] + bottomColorOffset[1], 0,1),
    clamp(hsvBody[2] + bottomColorOffset[2], 0,1)
  ];
  
  const rgbBody = hsvToRgb(...hsvBody);
  const hexBody = rgbToHex(...rgbBody);
  const colorBody = new Color(hexBody);
  const rgbBottom = hsvToRgb(...hsvBottom);
  const hexBottom = rgbToHex(...rgbBottom);
  const colorBottom = new Color(hexBottom);
  
  gradient.colors = [colorBody, colorBottom];
  return {type: "gradient", gradient, textColor};
}

function monochrome(colorString) {
  const {color, textColor} = getBaseHsvAndTextColor(colorString)
  
  const rgb = hsvToRgb(...color);
  const hex = rgbToHex(...rgb);
  
  return {type: "monochrome", color: new Color(hex), textColor}
}

function getBaseHsvAndTextColor(colorString){
  const { whiteTextColor, blackTextColor } = getTextColors();
  let textColor = whiteTextColor;
  let color;
  
  switch(colorString){
    case "light-yellow":
      color = [52,.8,1];
      textColor = blackTextColor;
      break;
    case "yellow": 
      color = [48,.85,1];
      textColor = blackTextColor;
      break;
    case "dark-yellow":
      color = [42,1,.94];
      textColor = blackTextColor;
      break;
    case "light-orange":
      color = [40,.80,1];
      textColor = blackTextColor;
      break;
    case "orange":
      color = [33,.80,1];
      textColor = blackTextColor;
      break;
    case "dark-orange":
      color = [20,.96,.74];
      break;
    case "light-red":
      color = [8,.72,1];
      textColor = blackTextColor;
      break;
    case "red":
      color = [4,.78,.91];
      break;
    case "dark-red": 
      color = [0,1,.53];
      break;
    case "light-pink":
      color = [320,.33,1];
      textColor = blackTextColor;
      break;
    case "pink":
      color = [320,.66,1];
      break;
    case "dark-pink":
      color = [320,.96,.69];
      break;
    case "light-purple": 
      color = [281,.37,1];
      textColor = blackTextColor;
      break;
    case "purple":
      color = [281,.72,.81];
      break;
    case "dark-purple":
      color = [281,.68,.44];
      break;
    case "light-blue":
      color = [191,1,.86];
      break;
    case "blue":
      color = [210,.73,.8];
      break;
    case "dark-blue":
      color = [212,.68,.31];
      break;
    case "light-green":
      color = [96,.68,.89];
      textColor = blackTextColor;
      break;
    case "green":
      color = [107,.67,.6];
      break;
    case "dark-green":
      color = [136,.96,.31];
      break;
    case "light-gray":
      color = [0,0,.76];
      textColor = blackTextColor;
      break;
    case "gray":
      color = [224,.06,.40];
      break;
    case "dark-gray":
      color = [224,.12,.3];
      break;
    case "black":
      color = [0,0,.15];
      break;
    case "white":
      color = [0,0,1];
      textColor = blackTextColor;
      break;
    default:
      color = [4,.78,.96];
  }
  return {type: "hsv", color, textColor};
}
