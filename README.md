# Scriptable Next Birthdays
A small script displaying the next birthdays inside a iOS/iPadOS (stable) or macOS (beta) widget using the [Scriptable app](https://scriptable.app/)!

<img src="https://user-images.githubusercontent.com/62344871/189611707-cc81bc69-72c3-4e66-a800-e6ee23a15be4.png" alt="Next Birthday Widget" width="400" />

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

<details><summary><h3>Settings</h3></summary>
   
If you run the script inside the app, an alert will be presented to customize the script
 
<img src="https://user-images.githubusercontent.com/62344871/189612337-38a093d6-6e0e-4df3-a3c5-824e7f6f7571.png" alt="next birthday script settings" width="300"/>

You have following options:
 1. Choose one of predefined colors as background color
 2. Set a custom color in RGB hexadecimal, for example `#F30330`
 3. Adjust the widget title to your personal needs
 4. (just view the result)

</details>

## 🚨 FAQ

<details><summary><h3>Contact synchronisation doesn't work</h3></summary>

Since the Contact API used by this script provides very rich information about your contactts, the memory limitations were exceeded quite fast. To bypass this issue, a chache file gets created/updated on every execution in the app, since the app is not affected by this. To reflect your contact changes also in the widget, just re-execute the script in the app.
</details>

<details><summary><h3>Script cannot be executed because of iCloud error</h3></summary>
## 🔒 Privacy

Contact information and any other data were only processed locally and stored on your device or your iCloud storage (depending on your device setup)…
