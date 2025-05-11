function doGet(e) {
  var template;
  var activeUser = getActiveUser();
  
  if (!activeUser) {
    // Redirection vers la page de connexion si aucun utilisateur actif
    template = HtmlService.createTemplateFromFile('connexions');
  } else {
    // Redirection vers le dashboard en fonction du rôle
    template = HtmlService.createTemplateFromFile('dashboard');
    template.user = activeUser;
    template.role = getRole(activeUser);
  }
  
  return template.evaluate()
    .setTitle('Yoozak Rescue CMD')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Fonction pour inclure des fichiers HTML
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Obtenir l'utilisateur actif depuis les propriétés du script
function getActiveUser() {
  var userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty('activeUser');
}

// Définir l'utilisateur actif dans les propriétés du script
function setActiveUser(username) {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('activeUser', username);
}

// Obtenir le rôle de l'utilisateur
function getRole(username) {
  var sheet = SpreadsheetApp.openById('1nhEpjRtGOBnwXLY8CBtcsMg1Cbfu-pox3ylraFoCg4c').getSheetByName('CMDutilisateurs');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      return data[i][1]; // Retourne le rôle (admin ou opérateur)
    }
  }
  
  return null;
}

// Effacer l'utilisateur actif (déconnexion)
function logout() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('activeUser');
  return true;
} 