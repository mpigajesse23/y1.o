// Obtenir l'URL de base de l'application depuis Code.gs
function getAppUrl() {
  // Cette fonction est implémentée dans Code.gs et sera accessible globalement
  return Code.getAppUrl();
}

// Fonction pour mettre à jour les horodatages
function updateTimestamps(username, action) {
  try {
    if (!username || !action) {
      console.error("Paramètres manquants pour updateTimestamps - username:", username, "action:", action);
      return false;
    }

    console.log("Début de updateTimestamps pour", username, "action:", action);

    // Ouvrir la feuille de calcul
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS);
    var sheet = ss.getSheetByName(SHEET_NAMES.USERS);
    
    console.log("Feuille récupérée:", sheet ? "OK" : "NULL");
    
    if (!sheet) {
      console.error("La feuille CMDutilisateurs n'a pas été trouvée");
      // Essayer de lister toutes les feuilles disponibles
      var allSheets = ss.getSheets();
      var sheetNames = allSheets.map(function(s) { return s.getName(); });
      console.log("Feuilles disponibles:", sheetNames.join(", "));
      return false;
    }
    
    // Obtenir toutes les données
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    console.log("Headers actuels:", headers);
    
    // Vérifier et créer les colonnes nécessaires
    var colHeureConnexion = headers.indexOf("HeureConnexion");
    var colHeureDeconnexion = headers.indexOf("HeureDeconnexion");
    var colDerniereDeconnexion = headers.indexOf("DerniereDeconnexion");
    
    console.log("Indices des colonnes - HeureConnexion:", colHeureConnexion, 
               "HeureDeconnexion:", colHeureDeconnexion, 
               "DerniereDeconnexion:", colDerniereDeconnexion);
    
    // Ajouter les colonnes manquantes
    var lastCol = headers.length;
    if (colHeureConnexion === -1) {
      console.log("Ajout de la colonne HeureConnexion");
      colHeureConnexion = lastCol;
      sheet.getRange(1, lastCol + 1).setValue("HeureConnexion");
      lastCol++;
    }
    
    if (colHeureDeconnexion === -1) {
      console.log("Ajout de la colonne HeureDeconnexion");
      colHeureDeconnexion = lastCol;
      sheet.getRange(1, lastCol + 1).setValue("HeureDeconnexion");
      lastCol++;
    }
    
    if (colDerniereDeconnexion === -1) {
      console.log("Ajout de la colonne DerniereDeconnexion");
      colDerniereDeconnexion = lastCol;
      sheet.getRange(1, lastCol + 1).setValue("DerniereDeconnexion");
      lastCol++;
    }
    
    // Si des colonnes ont été ajoutées, rafraîchir les données
    if (lastCol > headers.length) {
      SpreadsheetApp.flush();
      data = sheet.getDataRange().getValues();
      headers = data[0];
      console.log("Nouveaux headers:", headers);
    }
    
    // Trouver la ligne de l'utilisateur
    var userRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase() === username.toString().toLowerCase()) {
        userRow = i + 1; // +1 car les indices commencent à 1 dans Sheets API
        break;
      }
    }
    
    if (userRow === -1) {
      console.error("Utilisateur non trouvé:", username);
      console.log("Liste des utilisateurs disponibles:");
      for (var i = 1; i < data.length; i++) {
        console.log(" - ", data[i][0]);
      }
      return false;
    }
    
    console.log("Utilisateur trouvé à la ligne", userRow);
    
    // Obtenir la date et l'heure actuelles
    var now = new Date();
    var dateTimeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    
    // Mettre à jour les cellules appropriées
    if (action === 'connexion') {
      sheet.getRange(userRow, colHeureConnexion + 1).setValue(dateTimeStr);
      sheet.getRange(userRow, colHeureDeconnexion + 1).setValue(""); // Effacer l'heure de déconnexion
    } else if (action === 'deconnexion') {
      sheet.getRange(userRow, colHeureDeconnexion + 1).setValue(dateTimeStr);
      sheet.getRange(userRow, colDerniereDeconnexion + 1).setValue(dateTimeStr);
    }
    
    // Forcer la mise à jour immédiate
    SpreadsheetApp.flush();
    
    // Vérifier que les valeurs ont été écrites
    var updatedData = sheet.getDataRange().getValues();
    if (action === 'connexion') {
      // userRow est 1-based, donc -1 pour obtenir l'index 0-based dans le tableau de données
      console.log("Valeur après mise à jour:", updatedData[userRow-1][colHeureConnexion]);
    } else if (action === 'deconnexion') {
      console.log("Valeur HeureDeconnexion après mise à jour:", updatedData[userRow-1][colHeureDeconnexion]);
      console.log("Valeur DerniereDeconnexion après mise à jour:", updatedData[userRow-1][colDerniereDeconnexion]);
    }
    
    console.log("Mise à jour des horodatages terminée avec succès");
    return true;
  } catch (error) {
    console.error("Erreur dans updateTimestamps:", error);
    console.error("Stack:", error.stack);
    return false;
  }
}

// Fonction pour journaliser les actions
function logAction(username, action) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS).getSheetByName(SHEET_NAMES.LOG);
    var date = new Date();
    sheet.appendRow([date, username, action]);
  } catch (e) {
    console.error('Erreur de journalisation: ' + e.toString());
  }
}

// Fonction pour authentifier un utilisateur
function authentifier(username, password) {
  try {
    if (!username || !password) {
      return { 
        success: false, 
        message: "Veuillez remplir tous les champs" 
      };
    }

    console.log("Tentative d'authentification pour:", username);
    
    // Utiliser l'ID spécifique du spreadsheet
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS);
    var sheet = ss.getSheetByName(SHEET_NAMES.USERS);
    
    if (!sheet) {
      console.error("Feuille CMDutilisateurs introuvable");
      return { 
        success: false, 
        message: "Erreur système: feuille utilisateurs introuvable" 
      };
    }

    // Obtenir les en-têtes
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log("En-têtes trouvés:", headers);
    
    // Convertir les en-têtes en chaînes de caractères et nettoyer
    headers = headers.map(header => String(header).trim());
    console.log("En-têtes après nettoyage:", headers);
    
    // Fonction helper pour trouver l'index avec différentes variations
    function findHeaderIndex(variations) {
      for (var i = 0; i < headers.length; i++) {
        var headerLower = headers[i].toLowerCase();
        if (variations.some(v => headerLower === v.toLowerCase())) {
          return i;
        }
      }
      return -1;
    }
    
    var colonnes = {
      nom: findHeaderIndex(['Nom', 'nom', 'name']),
      role: findHeaderIndex(['Role', 'role', 'rôle', 'fonction']),
      password: findHeaderIndex(['Password', 'password', 'mot de passe', 'mdp'])
    };

    console.log("Indices des colonnes trouvés:", colonnes);

    // Vérifier les colonnes essentielles
    if (colonnes.nom === -1 || colonnes.role === -1 || colonnes.password === -1) {
      console.error("Structure de la feuille invalide");
      console.error("En-têtes attendus: 'Nom', 'Role', 'Password'");
      console.error("En-têtes trouvés:", headers);
      console.error("Indices trouvés:", colonnes);
      return { 
        success: false, 
        message: "Erreur système: structure de données invalide. Vérifiez les logs pour plus de détails." 
      };
    }

    // Obtenir toutes les données
    var data = sheet.getDataRange().getValues();
    
    // Rechercher l'utilisateur
    for (var i = 1; i < data.length; i++) {
      if (data[i][colonnes.nom] === username) {
        if (data[i][colonnes.password] === password) {
          var userRole = data[i][colonnes.role];
          
          // Mettre à jour les horodatages
          try {
            updateTimestamps(username, 'connexion');
          } catch (e) {
            console.error("Erreur lors de la mise à jour des horodatages:", e);
          }
          
          // Journaliser la connexion
          try {
            logAction(username, 'Connexion');
          } catch (e) {
            console.error("Erreur lors de la journalisation:", e);
          }
          
          // Stocker dans le cache
          try {
            var userCache = CacheService.getUserCache();
            var userData = JSON.stringify({
              username: username,
              role: userRole,
              timestamp: new Date().getTime()
            });
            userCache.put(Session.getActiveUser().getEmail(), userData, 3600);
          } catch (e) {
            console.error("Erreur lors de la mise en cache:", e);
          }
          
          console.log("Authentification réussie pour", username);
          return {
            success: true,
            message: "Connexion réussie",
            redirectUrl: getAppUrl() + '?page=homes&user=' + 
                        encodeURIComponent(username) + '&role=' + 
                        encodeURIComponent(userRole),
            role: userRole
          };
        } else {
          console.log("Mot de passe incorrect pour", username);
          return {
            success: false,
            message: "Mot de passe incorrect"
          };
        }
      }
    }
    
    console.log("Utilisateur non trouvé:", username);
    return {
      success: false,
      message: "Cet utilisateur n'existe pas"
    };
    
  } catch (e) {
    console.error("Erreur d'authentification:", e);
    return {
      success: false,
      message: "Erreur système: " + e.toString()
    };
  }
}

function normaliserRole(role) {
  if (!role) return null;
  
  role = role.toLowerCase().trim();
  
  // Table de correspondance des rôles
  const rolesValides = {
    'admin': 'admin',
    'administrateur': 'admin',
    'operateur': 'operateur',
    'opérateur': 'operateur'
  };
  
  return rolesValides[role] || null;
}

function getAppUrl(role) {
  var scriptId = ScriptApp.getScriptId();
  var baseUrl = ScriptApp.getService().getUrl();
  
  // Normaliser le rôle
  role = normaliserRole(role);
  
  switch(role) {
    case 'admin':
      return baseUrl + '?page=admin';
    case 'operateur':
      return baseUrl + '?page=operateur';
    default:
      return baseUrl;
  }
}

// Fonction pour vérifier si un utilisateur existe
function checkUserExists(username) {
  try {
    var sheet = SpreadsheetApp.openById('1nhEpjRtGOBnwXLY8CBtcsMg1Cbfu-pox3ylraFoCg4c').getSheetByName('CMDutilisateurs');
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === username) {
        return true;
      }
    }
    
    return false;
  } catch(e) {
    console.error("Erreur dans checkUserExists:", e);
    return false;
  }
}

// Vérifier si un utilisateur est connecté (à partir des paramètres d'URL)
function verifierConnexion() {
  var userCache = CacheService.getUserCache();
  var userEmail = Session.getActiveUser().getEmail();
  
  // Vérifier si l'utilisateur est en cache
  var userData = userCache.get(userEmail);
  if (!userData) {
    return { success: false, message: "Session expirée. Veuillez vous reconnecter." };
  }
  
  try {
    userData = JSON.parse(userData);
    
    // Normaliser le rôle
    var role = normaliserRole(userData.role);
    
    // Vérifier si le rôle est valide
    if (!role) {
      return { success: false, message: "Rôle non valide. Veuillez contacter l'administrateur." };
    }
    
    return {
      success: true,
      role: role,
      email: userEmail
    };
  } catch (e) {
    console.error("Erreur lors de la vérification de connexion:", e);
    return { success: false, message: "Erreur de session. Veuillez vous reconnecter." };
  }
}

// Récupérer l'historique des connexions pour un utilisateur
function getHistoriqueConnexions(username) {
  if (!username) {
    return [];
  }
  
  var sheet = SpreadsheetApp.openById('1nhEpjRtGOBnwXLY8CBtcsMg1Cbfu-pox3ylraFoCg4c').getSheetByName('CMDlog');
  var data = sheet.getDataRange().getValues();
  var historique = [];
  
  // Trouver les 10 dernières connexions/déconnexions
  for (var i = data.length - 1; i > 0; i--) {
    if (data[i][1] === username && (data[i][2] === 'Connexion' || data[i][2] === 'Déconnexion')) {
      historique.push({
        date: data[i][0],
        action: data[i][2]
      });
      
      if (historique.length >= 10) break;
    }
  }
  
  return historique;
}

// Obtenir le rôle de l'utilisateur à partir du nom d'utilisateur
function getRole(username) {
  try {
    if (!username) return null;
    
    // Normaliser le nom d'utilisateur pour comparaison
    var normalizedUsername = String(username).trim().toLowerCase();
    
    var sheet = SpreadsheetApp.openById('1nhEpjRtGOBnwXLY8CBtcsMg1Cbfu-pox3ylraFoCg4c').getSheetByName('CMDutilisateurs');
    var data = sheet.getDataRange().getValues();
    
    console.log("Recherche du rôle pour l'utilisateur:", normalizedUsername);
    
    for (var i = 1; i < data.length; i++) {
      var sheetUsername = String(data[i][0]).trim().toLowerCase();
      
      if (sheetUsername === normalizedUsername) {
        console.log("Utilisateur trouvé, rôle:", data[i][1]);
        return data[i][1]; // Retourne le rôle (admin ou opérateur)
      }
    }
    
    // Si aucune correspondance exacte, essayons une recherche plus souple
    for (var i = 1; i < data.length; i++) {
      var sheetUsername = String(data[i][0]).trim().toLowerCase();
      
      if (sheetUsername.indexOf(normalizedUsername) >= 0 || normalizedUsername.indexOf(sheetUsername) >= 0) {
        console.log("Utilisateur trouvé par correspondance partielle, rôle:", data[i][1]);
        return data[i][1];
      }
    }
    
    console.log("Aucun utilisateur trouvé avec ce nom:", normalizedUsername);
    return null;
  } catch (e) {
    console.error("Erreur dans getRole:", e);
    return null;
  }
}

// Traitement de l'authentification côté serveur
function traiterAuthentification(formData) {
  try {
    console.log("Traitement de l'authentification pour:", formData.username);
    
    // Vérifier l'authentification
    var authResult = authentifier(formData.username, formData.password);
    
    if (authResult.success) {
      // Construire l'URL avec les paramètres de session - correction de 'home' à 'homes'
      var url = getAppUrl() + 
                '?page=homes' + 
                '&user=' + encodeURIComponent(formData.username) + 
                '&role=' + encodeURIComponent(authResult.role);
      
      // Retourner le résultat avec l'URL de redirection
      return {
        success: true,
        message: "Authentification réussie!",
        url: url,
        user: formData.username,
        role: authResult.role
      };
    } else {
      // Si l'authentification a échoué, retourner l'erreur
      return {
        success: false,
        message: authResult.message || "Échec de l'authentification"
      };
    }
  } catch (error) {
    console.error("Erreur dans traiterAuthentification:", error);
    return {
      success: false,
      message: "Erreur technique: " + error.message
    };
  }
}