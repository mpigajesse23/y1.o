/**
 * Point d'entrée principal pour l'application web
 */

// Constantes globales pour les IDs des Google Sheets
const SPREADSHEET_IDS = {
  // Feuille des utilisateurs et authentification
  CMD_USERS: "1nhEpjRtGOBnwXLY8CBtcsMg1Cbfu-pox3ylraFoCg4c",
  
  // Feuille des commandes initiales
  CMD_INT: "1xOgqtA-bXGE1zodIGoAer8A2rloofFVIlqTpmaaqANc",
  
  // Feuille des opérateurs
  CMD_OPERATEURS: "1Lw52bpEAUbKno-nZA8hx1cYMdHqJ1v8Ry-LoU76yFiE"
};

// Constantes pour les noms des feuilles
const SHEET_NAMES = {
  USERS: "CMDutilisateurs",
  LOG: "CMDlog",
  INIT: "CMDInit",
  OPERATEURS: "CMDoperateurs"
};

function doGet(e) {
  try {
    console.log("doGet appelé avec paramètres:", e);
    
    // Initialiser les propriétés du script si nécessaire
    initializeScriptProperties();
    
    // Récupérer les paramètres d'URL
    var params = e ? e.parameter : {};
    var page = params.page || 'connexions';  // Page par défaut est connexions.html
    var username = params.user;
    var userRole = params.role;
    var type = params.type || 'all';
    
    // URL complète du script pour les redirections
    var scriptUrl = getAppUrl();
    
    // Si pas de session et page différente de connexions, rediriger vers connexions
    if (page !== 'connexions' && (!username || !userRole)) {
      return HtmlService.createTemplateFromFile('connexions')
        .evaluate()
        .setTitle('Connexion - Yoozak Rescue CMD')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // Définir les pages disponibles et leurs contenus
    const pages = {
      'homes': {
        template: 'homes',
        title: 'Tableau de Bord'
      },
      'cmdinits': {
        template: 'cmdinits',
        title: 'Gestion des Commandes'
      },
      'cmdoperateurs': {
        template: 'cmdoperateurs',
        title: 'Mes Commandes'
      },
      'operateurs': {
        template: 'operateurs',
        title: 'Gestion des Opérateurs'
      }
    };
    
    // Si session active, vérifier le rôle et servir la page appropriée
    if (username && userRole) {
      // Créer le template principal
      var template = HtmlService.createTemplateFromFile('bases');
      
      // Assigner les variables au template
      template.user = username;
      template.role = userRole;
      template.scriptUrl = scriptUrl;
      template.currentPage = page;
      template.type = type;
      template.getAppUrl = function() { return scriptUrl; };
      
      // Préparer le contenu de la page
      var pageContent;
      
      // Vérifier si la page demandée existe dans notre définition
      if (pages[page]) {
        try {
          // Essayer de charger le template de la page
          var pageTemplate = HtmlService.createTemplateFromFile(pages[page].template);
          pageTemplate.type = type;
          pageTemplate.user = username;
          pageTemplate.role = userRole;
          pageTemplate.getAppUrl = function() { return scriptUrl; };
          
          pageContent = pageTemplate.evaluate().getContent();
        } catch (pageError) {
          console.error("Erreur lors du chargement du template de page:", pageError);
          pageContent = '<div class="alert alert-danger m-4">' +
            '<i class="bi bi-exclamation-triangle me-2"></i>' +
            'Erreur lors du chargement de la page: ' + pageError.toString() + 
            '</div>';
        }
      } else {
        // Pour les pages non définies, afficher un message "en développement"
        pageContent = '<div class="alert alert-info m-4">' +
          '<i class="bi bi-tools me-2"></i>' +
          '<strong>Page en développement</strong><br>' +
          'Cette fonctionnalité est en cours de développement et sera disponible prochainement.' +
          '</div>';
      }
      
      template.contentPlaceholder = pageContent;
      
      // Retourner la page
      return template.evaluate()
        .setTitle('Yoozak Rescue CMD - ' + (pages[page] ? pages[page].title : 'Page'))
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // Par défaut, retourner la page de connexion
    return HtmlService.createTemplateFromFile('connexions')
      .evaluate()
      .setTitle('Connexion - Yoozak Rescue CMD')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error("Erreur dans doGet:", error);
    return HtmlService.createHtmlOutput(
      '<div class="alert alert-danger m-4">' +
      '<i class="bi bi-exclamation-triangle me-2"></i>' +
      'Une erreur est survenue: ' + error.toString() +
      '<br><a href="' + getAppUrl() + '" class="btn btn-primary mt-3">Réessayer</a>' +
      '</div>'
    );
  }
}

/**
 * Initialise les propriétés du script si nécessaire
 */
function initializeScriptProperties() {
  try {
    var scriptProperties = PropertiesService.getScriptProperties();
    var props = scriptProperties.getProperties();
    
    // Vérifier si les propriétés sont déjà initialisées
    if (!props.initialized) {
      console.log("Initialisation des propriétés du script");
      
      // Définir les propriétés par défaut
      scriptProperties.setProperties({
        'initialized': 'true',
        'sessionExpiration': 'false', // Les sessions n'expirent pas pour le moment
        'sessionTimeout': '3600' // Par défaut 1 heure (pas utilisé actuellement)
      });
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation des propriétés:", error);
  }
}

// Fonction pour inclure des fichiers HTML
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Fonction pour servir la page de connexion
function serveLoginPage(errorMessage) {
  console.log("Affichage de la page de connexion" + (errorMessage ? " avec erreur: " + errorMessage : ""));
  
  var loginTemplate = HtmlService.createTemplateFromFile('connexions');
  
  // Ajouter l'URL du script pour permettre la redirection
  loginTemplate.scriptUrl = getAppUrl();
  
  // Ajouter un message d'erreur si nécessaire
  if (errorMessage) {
    loginTemplate.errorMessage = errorMessage;
  }
  
  return loginTemplate.evaluate()
    .setTitle('Connexion - Yoozak Rescue CMD')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setFaviconUrl('https://www.gstatic.com/script/apps_script_1x.png');
}

// Fonction pour servir la page d'erreur
function serveErrorPage(error) {
  return HtmlService.createTemplate(
    '<div style="text-align: center; margin-top: 50px;">' +
    '<h1>Erreur</h1>' +
    '<p>Une erreur s\'est produite lors du chargement de l\'application.</p>' +
    '<p>Erreur: ' + error + '</p>' +
    '<p><a href="' + getAppUrl() + '" class="btn btn-primary">Réessayer</a></p>' +
    '</div>'
  ).evaluate()
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Mettre à jour la dernière activité de l'utilisateur
function updateLastActivity(username) {
  try {
    // Ici, vous pourriez mettre à jour un champ "dernière activité" dans la feuille des utilisateurs
    // Ce code est similaire à updateLastLogin mais peut être utilisé pour toute activité
    console.log("Mise à jour de la dernière activité pour:", username);
  } catch (e) {
    console.error("Erreur dans updateLastActivity:", e);
  }
}

// Mettre à jour la date de dernière connexion
function updateLastLogin(username) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS).getSheetByName(SHEET_NAMES.USERS);
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === username) {
        // Mettre à jour la date de dernière connexion (dans la colonne 4 si elle existe)
        if (data[0].length >= 4) {
          sheet.getRange(i + 1, 4).setValue(new Date());
        }
        break;
      }
    }
  } catch (e) {
    console.error("Erreur dans updateLastLogin:", e);
  }
}

// Obtenir le rôle de l'utilisateur
function getRole(username) {
  try {
    if (!username) return null;
    
    // Normaliser le nom d'utilisateur pour comparaison
    var normalizedUsername = String(username).trim().toLowerCase();
    
    var sheet = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS).getSheetByName(SHEET_NAMES.USERS);
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

// Effacer l'utilisateur actif (déconnexion)
function logout() {
  try {
    // Essayer de journaliser la déconnexion si possible
    // mais continuer même en cas d'erreur
    try {
      // Comme nous utilisons les paramètres d'URL pour la session,
      // nous n'avons pas forcément accès au paramètre utilisateur lors de l'appel de cette fonction
      logAction('Utilisateur', 'Déconnexion');
    } catch(e) {
      console.error("Erreur lors de la journalisation de la déconnexion:", e);
    }
  
    // Nettoyer les propriétés utilisateur (bien que non utilisé dans l'architecture actuelle)
    var userProperties = PropertiesService.getUserProperties();
    userProperties.deleteProperty('activeUser');
  
    // Rediriger vers la page de connexion
    return HtmlService.createHtmlOutput(
      "<script>window.top.location.href = '" + getAppUrl() + "';</script>"
    );
  } catch (e) {
    console.error("Erreur dans logout:", e);
    
    // Même en cas d'erreur, essayer de rediriger
    return HtmlService.createHtmlOutput(
      "<script>window.top.location.href = '" + getAppUrl() + "';</script>"
    );
  }
}

// Fonction pour journaliser les actions utilisateur
function logAction(username, action) {
  try {
    console.log("Action utilisateur:", username, action);
    
    // Journalisation dans la feuille de calcul
    var sheet = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS).getSheetByName(SHEET_NAMES.LOG);
    if (sheet) {
      sheet.appendRow([new Date(), username, action]);
    }
  } catch(e) {
    console.error("Erreur de journalisation:", e);
  }
}

// Fonction utilitaire pour formater la date et l'heure
function formatDateTime(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
}

// Fonction pour mettre à jour les horodatages dans la feuille
function updateUserTimestamp(username, action) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS).getSheetByName(SHEET_NAMES.USERS);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    // Trouver ou créer les colonnes nécessaires
    var heureConnexionCol = -1;
    var heureDeconnexionCol = -1;
    var derniereDeconnexionCol = -1;

    // Vérifier si les colonnes existent
    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === 'HeureConnexion') heureConnexionCol = i + 1;
      if (headers[i] === 'HeureDeconnexion') heureDeconnexionCol = i + 1;
      if (headers[i] === 'DerniereDeconnexion') derniereDeconnexionCol = i + 1;
    }

    // Créer les colonnes si elles n'existent pas
    var lastCol = headers.length + 1;
    if (heureConnexionCol === -1) {
      heureConnexionCol = lastCol++;
      sheet.getRange(1, heureConnexionCol).setValue('HeureConnexion');
    }
    if (heureDeconnexionCol === -1) {
      heureDeconnexionCol = lastCol++;
      sheet.getRange(1, heureDeconnexionCol).setValue('HeureDeconnexion');
    }
    if (derniereDeconnexionCol === -1) {
      derniereDeconnexionCol = lastCol++;
      sheet.getRange(1, derniereDeconnexionCol).setValue('DerniereDeconnexion');
    }

    // Chercher l'utilisateur
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toLowerCase() === username.toLowerCase()) {
        var now = new Date();
        var formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
        var formattedDateTime = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

        if (action === 'connexion') {
          // Mettre à jour l'heure de connexion
          sheet.getRange(i + 1, heureConnexionCol).setValue(formattedTime);
          console.log("Heure de connexion enregistrée pour " + username + ": " + formattedTime);
        } else if (action === 'deconnexion') {
          // Mettre à jour l'heure de déconnexion et la date
          sheet.getRange(i + 1, heureDeconnexionCol).setValue(formattedTime);
          sheet.getRange(i + 1, derniereDeconnexionCol).setValue(formattedDateTime);
          console.log("Heure de déconnexion enregistrée pour " + username + ": " + formattedTime);
          console.log("Date de déconnexion enregistrée pour " + username + ": " + formattedDateTime);
        }

        // Forcer le rafraîchissement de la feuille
        SpreadsheetApp.flush();
        break;
      }
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des horodatages:", error);
    console.error("Stack:", error.stack);
  }
}

// Modifier la fonction authentifier pour utiliser updateTimestamps
function authentifier(username, password) {
  if (!username || !password) {
    return {
      success: false,
      message: 'Veuillez remplir tous les champs'
    };
  }
  
  try {
    console.log("Tentative d'authentification pour:", username);
    
    var sheet = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS).getSheetByName(SHEET_NAMES.USERS);
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === username) {
        if (data[i][2] === password) {
          var userRole = data[i][1];
          
          // Mettre à jour les horodatages de connexion
          try {
            console.log("Appel direct de la fonction updateTimestamps pour la connexion");
            var timestampResult = updateTimestamps(username, 'connexion');
            console.log("Résultat de updateTimestamps pour connexion:", timestampResult);
            
            if (!timestampResult) {
              console.warn("Avertissement: échec de la mise à jour des horodatages, mais l'authentification continue");
            }
          } catch (updateError) {
            console.error("Erreur lors de la mise à jour des horodatages:", updateError, updateError.stack);
            // Ne pas bloquer l'authentification en cas d'erreur
          }
          
          // Journaliser la connexion
          logAction(username, 'Connexion');
          
          console.log("Authentification réussie pour", username, "avec le rôle", userRole);
          
          return {
            success: true,
            message: 'Connexion réussie',
            user: username,
            role: userRole,
            redirectUrl: getAppUrl() + '?page=homes&user=' + encodeURIComponent(username) + '&role=' + encodeURIComponent(userRole)
          };
        } else {
          return {
            success: false,
            message: 'Mot de passe incorrect'
          };
        }
      }
    }
    
    return {
      success: false,
      message: 'Cet utilisateur n\'existe pas'
    };
  } catch(e) {
    console.error("Erreur d'authentification:", e);
    return {
      success: false,
      message: 'Erreur de connexion: ' + e.toString()
    };
  }
}

// Fonction vide utilisée comme callback pour la redirection
function doNothing() {
  return true;
}

// Fonction pour obtenir l'utilisateur actif
function getActiveUser() {
  try {
    // Dans cette architecture, l'utilisateur est passé via les paramètres d'URL
    // Donc nous devons récupérer ces informations à partir de la requête en cours
    var cache = CacheService.getUserCache();
    var activeUser = cache.get('currentUser');
    
    if (!activeUser) {
      // Si aucun utilisateur n'est trouvé dans le cache, essayer d'autres méthodes
      // Mais cette fonction est principalement utilisée pour la journalisation lors de la déconnexion
      // donc ce n'est pas critique si elle échoue
      console.log("Impossible de déterminer l'utilisateur actif pour la déconnexion");
      return null;
    }
    
    return activeUser;
  } catch (e) {
    console.error("Erreur dans getActiveUser:", e);
    return null;
  }
}

// Modifier la fonction logoutUser pour utiliser updateTimestamps
function logoutUser(username) {
  try {
    console.log("Début de la procédure de déconnexion pour:", username);
    
    if (!username) {
      console.error("Tentative de déconnexion sans nom d'utilisateur");
      return {
        success: false,
        message: "Nom d'utilisateur requis pour la déconnexion",
        redirectUrl: getAppUrl() + '?page=connexions'
      };
    }

    // Mettre à jour les horodatages de déconnexion
    try {
      console.log("Appel de updateTimestamps pour la déconnexion de:", username);
      var timestampResult = updateTimestamps(username, 'deconnexion');
      console.log("Résultat de updateTimestamps:", timestampResult);

      if (!timestampResult) {
        console.error("Échec de la mise à jour des horodatages pour:", username);
        return {
          success: false,
          message: "Erreur lors de la mise à jour des horodatages",
          redirectUrl: getAppUrl() + '?page=connexions'
        };
      }
    } catch (updateError) {
      console.error("Erreur lors de l'appel à updateTimestamps:", updateError);
      return {
        success: false,
        message: "Erreur technique: " + updateError.toString(),
        redirectUrl: getAppUrl() + '?page=connexions'
      };
    }

    // Journaliser la déconnexion
    try {
      logAction(username, 'Déconnexion');
      console.log("Action de déconnexion journalisée pour:", username);
    } catch (logError) {
      console.error("Erreur lors de la journalisation de la déconnexion:", logError);
    }
    
    // Nettoyer le cache utilisateur
    try {
      var cache = CacheService.getUserCache();
      cache.remove('currentUser');
      console.log("Cache utilisateur nettoyé");
    } catch (cacheError) {
      console.error("Erreur lors du nettoyage du cache:", cacheError);
    }
    
    // Nettoyer les propriétés utilisateur
    try {
      var userProperties = PropertiesService.getUserProperties();
      userProperties.deleteProperty('activeUser');
      console.log("Propriétés utilisateur nettoyées");
    } catch (propError) {
      console.error("Erreur lors du nettoyage des propriétés:", propError);
    }

    console.log("Déconnexion réussie pour:", username);
    
    return {
      success: true,
      message: "Déconnexion réussie",
      redirectUrl: getAppUrl() + '?page=connexions'
    };
  } catch (error) {
    console.error("Erreur critique lors de la déconnexion:", error);
    return {
      success: false,
      message: "Erreur lors de la déconnexion: " + error.toString(),
      redirectUrl: getAppUrl() + '?page=connexions'
    };
  }
}

/**
 * Vérifie la validité d'une session utilisateur
 * Cette fonction est appelée depuis le client pour vérifier si la session est toujours valide
 * @param {Object} sessionData - Données de session (user, role)
 * @return {Object} - Résultat de la vérification
 */
function verifierConnexion(sessionData) {
  try {
    console.log("Vérification de connexion pour:", sessionData);
    
    // Si pas de données de session, vérifier dans le cache
    if (!sessionData || !sessionData.user || !sessionData.role) {
      var cache = CacheService.getUserCache();
      var cachedUser = cache.get('currentUser');
      var cachedRole = cache.get('userRole');
      
      if (cachedUser && cachedRole) {
        sessionData = {
          user: cachedUser,
          role: cachedRole
        };
      } else {
        console.error("Aucune donnée de session trouvée");
        return {
          connecte: false,
          message: "Session expirée"
        };
      }
    }
    
    // Vérifier si l'utilisateur existe dans la base de données
    var roleFromDB = getRole(sessionData.user);
    
    if (!roleFromDB) {
      console.error("Utilisateur non trouvé dans la base de données:", sessionData.user);
      return {
        connecte: false,
        message: "Utilisateur non trouvé"
      };
    }
    
    // Normaliser les rôles pour la comparaison
    var normalizedRoleSession = String(sessionData.role).trim().toLowerCase();
    var normalizedRoleDB = String(roleFromDB).trim().toLowerCase();
    
    // Accepter les variations de rôle admin/administrateur
    if ((normalizedRoleDB === 'admin' || normalizedRoleDB === 'administrateur') &&
        (normalizedRoleSession === 'admin' || normalizedRoleSession === 'administrateur')) {
      // Rafraîchir le cache
      try {
        var cache = CacheService.getUserCache();
        cache.put('currentUser', sessionData.user, 21600); // 6 heures
        cache.put('userRole', roleFromDB, 21600);
      } catch (cacheError) {
        console.warn("Erreur de mise en cache:", cacheError);
      }
      
      return {
        connecte: true,
        utilisateur: sessionData.user,
        role: roleFromDB
      };
    }
    
    // Pour les autres rôles
    if (normalizedRoleDB === normalizedRoleSession) {
      // Rafraîchir le cache
      try {
        var cache = CacheService.getUserCache();
        cache.put('currentUser', sessionData.user, 21600);
        cache.put('userRole', roleFromDB, 21600);
      } catch (cacheError) {
        console.warn("Erreur de mise en cache:", cacheError);
      }
      
      return {
        connecte: true,
        utilisateur: sessionData.user,
        role: roleFromDB
      };
    }
    
    return {
      connecte: false,
      message: "Session invalide"
    };
  } catch (error) {
    console.error("Erreur lors de la vérification de connexion:", error);
    return {
      connecte: false,
      message: "Erreur technique: " + error.message
    };
  }
}

/**
 * Créer un namespace global pour les fonctions partagées
 */
var Code = (function() {
  return {
    getAppUrl: getAppUrl
  };
})();

/**
 * Obtenir l'URL de base de l'application
 * Cette fonction retourne l'URL de déploiement en production 
 * et une URL propre en développement
 */
function getAppUrl() {
  try {
    // Obtenir l'URL du service
    var url = ScriptApp.getService().getUrl();
    
    // Si nous sommes en environnement de développement (contient userCodeAppPanel)
    if (url.indexOf('userCodeAppPanel') !== -1) {
      // Utiliser l'URL de déploiement en mode développement
      // On peut utiliser une URL fixe ou dynamique selon le cas
      var deploymentId = PropertiesService.getScriptProperties().getProperty('DEPLOYMENT_ID');
      
      if (deploymentId) {
        // Si un ID de déploiement est défini, utiliser cet ID
        return 'https://script.google.com/macros/s/' + deploymentId + '/exec';
      } else {
        // Sinon, extraire la partie essentielle de l'URL pour créer une URL propre
        // Format: https://script.google.com/macros/s/[ID]/dev
        var scriptId = ScriptApp.getScriptId();
        return 'https://script.google.com/macros/s/' + scriptId + '/dev';
      }
    }
    
    // En production, retourner l'URL du service telle quelle
    return url;
  } catch (error) {
    console.error("Erreur dans getAppUrl:", error);
    // Fallback - retourner simplement l'URL du service en cas d'erreur
    return ScriptApp.getService().getUrl();
  }
}

/**
 * Fonction pour définir l'ID de déploiement pour l'environnement de développement
 * Utilisez cette fonction une fois lors de la configuration
 */
function setDeploymentId(deploymentId) {
  if (!deploymentId) {
    throw new Error("ID de déploiement non fourni");
  }
  
  PropertiesService.getScriptProperties().setProperty('DEPLOYMENT_ID', deploymentId);
  console.log("ID de déploiement défini avec succès:", deploymentId);
  return "ID de déploiement défini: " + deploymentId;
}