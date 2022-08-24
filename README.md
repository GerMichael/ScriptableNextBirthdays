# Scriptable Next Birthdays
A small script displaying the next birthdays inside a iOS/iPadOS (stable) or macOS (beta) widget using the [Scriptable app](https://scriptable.app/)!

<img src="https://user-images.githubusercontent.com/62344871/186021454-d1eac7c6-41c2-45b8-80e4-92c2a6f98b41.png" alt="Next Birthday Widget" width="400" />

## 🛠 Setup

1. Download the Scriptable app from the [AppStore](https://apps.apple.com/de/app/scriptable/id1405459188) for iPhones and iPads. For mac you have to install the latest build of the beta version from the official website ([https://scriptable.app/mac-beta/](https://scriptable.app/mac-beta/)).
2. Create a new script inside the app and paste the code from ScriptableNextBirthdays.js
3. ⚠️ Run it one time **inside the app**. You may have to provide access to the contacts.
   _Reason for this step: To execute the script as widget, a precomputed and cached list of all birthdays has to be used due to memory limitations. Note: If you update the contacts, you have to sync the cache by executing the script in the app again!_
4. Add a new widget of the size you prefer to the homescreen and select Scriptable as source.
5. Select the script you've created just some seconds ago in the config-panel!
6. _(Optional: Adjust the settings in the script, see the documentation below)_

Enjoy the widget! 🎁

## 📖 Documentation

<details><summary>

### Settings
</summary>

The settings define how the widget renders the data. No defaults were deposited, so make sure every settings-entry exists.

```ts
// the hsv offset to compute the gradient. if the offset exceeds the limit, the value will be clamped, so no worries!
//   1. index: 0-360: the angle (red to yellow to green to … to red)
//   2. index: 0-1: saturation (e.g. white (0) to red (1))
//   3. index: 0-1: (blackish) value (e.g. black (0) to red (1))
type hsvGradientOffset = [number,number,number];

type settings = {
  // title text
  title: string;
  // horizontal alignment of title
  titleAlignment: "center" |  "right" | "left";
  // the background: gradient(colorString) or monochrome(colorString)
  // The colorString can be either "black", "white" or a variation of "yellow", "orange", "red", "pink", "purple", "blue", "green" and "gray"
  // The variations are "light-[color]", "[color]" and "dark-[color]"
  colorTheme: gradient(colorString) | monochrome(colorString);
  // font family for the title and body
  textFontFamilies: {
    regular: string;
    bold: string;
    light: string;
  };
  // Used to indicate text overflow
  textOverflowChar: string;
  // replace certain date differences, e.g. if the birthday is today (=0), a special birthday char can be displayed instead
  dateReplacements: {
    [number: string];
  };
  // The units for the date difference
  // either an array [1 day, rest] or string for everything
  dayUnit: {
    small: string;
    medium: string;
    large: string;
    extraLarge: string;
    default: string;
  };
  // Text size of title: number
  titleSize: {
    small: number;
    medium: number;
    large: number;
    extraLarge: number;
    default: number;
  };
  // spacing between text columns
  textColumnSpacing: {
    small: number;
    medium: number;
    large: number;
    extraLarge: number;
    default: number;
  };
  // the spacing size relative to the text/title size (0.3 = 0.3 * text size)
  verticalTextSpacing: {
    small: number;
    medium: number;
    large: number;
    extraLarge: number;
    default: number;
  };
  // Number of displayed contacts for widget sizes
  numberOfContactsForWidgetSize: {
    small: number;
    medium: number;
    large: number;
    extraLarge: number;
    default: number;
  };
  // left, right, top, bottom padding of widget: number
  widgetPadding: {
    small: number;
    medium: number;
    large: number;
    extraLarge: number;
    default: number;
  };
}
```
</details>

<details><summary>

### Rendering
</summary>

A few special features:
* The data is rendered using Scriptables `DrawContext`. Even though it is a bit more complicated and results in more challanges, the layout can be defined more flexible.
* The class `TextLength` is used to compute the length of texts for a particular font. This is necessary to clip overflowing texts. It creates a `WebView` instance evaluating JavaScript and uses the Canvas API to measure text lengths.
* Colors were represented using HSV to compute gradients based on a color.
* The script re-creates and persists the cache containing only the necessary contact information on every execution **in the app**. Later on, the execution in the widget environment with limited memory reads the cache file. If you want to delete the cache, simply remove `__nextBirthdays.cache` from the Scriptable folder.
</details>

## 🚨 FAQ

<details><summary>

### Contact synchronisation doesn't work
</summary>

Since the Contact API used by this script provides very rich information about your contactts, the memory limitations were exceeded quite fast. To bypass this issue, a chache file gets created/updated on every execution in the app, since the app is not affected by this. To reflect your contact changes also in the widget, just re-execute the script in the app.
</details>

<details><summary>

### Script cannot be executed because of iCloud error
</summary>

If you don't want to/cannot use iCloud and you get an error saying "Error on line …: iCloud is not supported. Make sure that you are logged into iCloud in the device settings.", please alter the script on lines 77 to 83 like this:

```diff
- try{
-   fm = FileManager.iCloud();
- } catch(e){
-   fm = FileManager.local();
- }
+ const fm = FileManager.local();
```
</details>

## 🔒 Privacy

Contact information and any other data were only processed locally and stored on your device or your iCloud storage (depending on your device setup)…
