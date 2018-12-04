const {
  app,
  Menu,
  MenuItem,
  shell,
  BrowserWindow,
  ipc
} = require('electron')

const {
  dialog
} = require('electron')

const fs = require('fs');
const path = require('path');


require('electron-handlebars')({
  title: 'Tool MMO',
  body: 'Tool MMO',
});


let mainWindow

const createMainWindow = () => {

  mainWindow = new BrowserWindow({
    // alwaysOnTop : true,
    show: false,
    modal: true,
    hasShadow: true,
    webPreferences: {
      webSecurity: false
    }
  })

  mainWindow.maximize();
  mainWindow.show();

  mainWindow.loadURL(`file://${__dirname}/view/index.hbs`);
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  let menu = Menu.buildFromTemplate([{
      label: "Home",
      click() {
        mainWindow.loadURL(`file://${__dirname}/view/index.hbs`)
      }
    },
    {
      label: "Menu",
      submenu: [{
          label: 'Check Blance Bloom',
          click() {
            mainWindow.loadURL(`file://${__dirname}/view/checkBlance.hbs`)
          }
        },

        {
          label: 'Check Card Bloom',
          click() {
            mainWindow.loadURL(`file://${__dirname}/view/checkCard.hbs`)
          }
        },

        {
          label: 'Check Login Bloom',
          click() {
            mainWindow.loadURL(`file://${__dirname}/view/checkLoginBloom.hbs`)
          }
        },

        {
          label: 'Check Login Sark',
          click() {
            mainWindow.loadURL(`file://${__dirname}/view/checkLoginSark.hbs`)
          }
        },
        {
          label: 'Check Request',
          click() {
            mainWindow.loadURL(`file://${__dirname}/view/checkRequest.hbs`)
          }
        },
      ]
    },
    {
      label: "Reload",
      click() {
        mainWindow.reload();
      }
    },
    {
      label: "Dev Tool",
      click() {
        mainWindow.webContents.openDevTools();
      }
    },
    {
      label: "Remove Data",
      click() {
        const dialogOptions = {
          type: 'info',
          buttons: ['OK', 'Cancel'],
          message: 'Are you sure remove All Data?'
        }

        dialog.showMessageBox(dialogOptions, confirmResult => {

          if (!confirmResult) {

            let directory = 'database';

            fs.readdir(directory, (err, files) => {
              for (let file of files) {
                fs.unlink(path.join(directory, file), err => {});
              }
              mainWindow.reload();
            });
          }

        })
      }
    },
    {
      label: "Exit",
      click() {
        app.quit();
      }
    }
  ])

  Menu.setApplicationMenu(menu);
}


app.on('ready', createMainWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createMainWindow()
  }
})