// Fichier contenant les fonctions pour la page d'accueil (tableau de bord)

/**
 * Obtenir les statistiques pour le tableau de bord
 */
function getDashboardStats() {
  try {
    var user = Session.getActiveUser().getEmail();
    if (!user) {
      return { error: "Utilisateur non connecté" };
    }

    // Accéder au fichier des commandes
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_INT);
    var sheetCMDInit = ss.getSheetByName(SHEET_NAMES.INIT);
    
    if (!sheetCMDInit) {
      return { error: "Feuille CMDInit introuvable" };
    }

    // Obtenir les en-têtes
    var headers = sheetCMDInit.getRange(1, 1, 1, sheetCMDInit.getLastColumn()).getValues()[0];
    var statutIndex = headers.indexOf("Statut");
    var dateCreationIndex = headers.indexOf("Date Création");

    if (statutIndex === -1 || dateCreationIndex === -1) {
      return { error: "Structure de la feuille invalide" };
    }

    // Obtenir toutes les données
    var lastRow = sheetCMDInit.getLastRow();
    if (lastRow <= 1) {
      return getEmptyStats();
    }

    var allData = sheetCMDInit.getRange(2, 1, lastRow - 1, sheetCMDInit.getLastColumn()).getValues();
    
    // Initialiser les compteurs
    var stats = {
      total: 0,
      nonAffectees: 0,
      affectees: 0,
      doublons: 0,
      erronees: 0,
      aujourd_hui: 0,
      hier: 0
    };

    // Date d'aujourd'hui et d'hier
    var maintenant = new Date();
    var aujourd_hui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    var hier = new Date(aujourd_hui);
    hier.setDate(hier.getDate() - 1);

    // Compter les commandes
    for (var i = 0; i < allData.length; i++) {
      var statut = allData[i][statutIndex] ? allData[i][statutIndex].toString() : "";
      var dateCreation = allData[i][dateCreationIndex];
      
      // Vérifier si la date est valide
      if (dateCreation instanceof Date && !isNaN(dateCreation.getTime())) {
        // Normaliser la date (sans l'heure)
        dateCreation = new Date(dateCreation.getFullYear(), dateCreation.getMonth(), dateCreation.getDate());
        
        // Compter par date
        if (dateCreation.getTime() === aujourd_hui.getTime()) {
          stats.aujourd_hui++;
        } else if (dateCreation.getTime() === hier.getTime()) {
          stats.hier++;
        }
      }

      // Compter par statut
      stats.total++;
      if (statut === "Non affectée") stats.nonAffectees++;
      else if (statut === "Affectée") stats.affectees++;
      else if (statut === "Doublon") stats.doublons++;
      else if (statut === "Erronée") stats.erronees++;
    }

    // Calculer la variation
    var variation = stats.hier > 0 ? 
      ((stats.aujourd_hui - stats.hier) / stats.hier) * 100 : 
      (stats.aujourd_hui > 0 ? 100 : 0);

    // Obtenir les statistiques des opérateurs
    var statsOperateurs = getOperateursStats();

    return {
      total: stats.total,
      nonAffectees: stats.nonAffectees,
      affectees: stats.affectees,
      doublons: stats.doublons,
      erronees: stats.erronees,
      evolution: {
        aujourd_hui: stats.aujourd_hui,
        hier: stats.hier,
        variation: Math.round(variation * 100) / 100
      },
      operateurs: statsOperateurs,
      timestamp: maintenant.toISOString()
    };

  } catch(e) {
    console.error("Erreur dans getDashboardStats:", e);
    return { error: e.toString() };
  }
}

/**
 * Retourne des statistiques vides
 */
function getEmptyStats() {
  return {
    total: 0,
    nonAffectees: 0,
    affectees: 0,
    doublons: 0,
    erronees: 0,
    evolution: {
      aujourd_hui: 0,
      hier: 0,
      variation: 0
    },
    operateurs: {
      actifs: 0,
      total: 0
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Obtenir les statistiques des opérateurs
 */
function getOperateursStats() {
  try {
    // Accéder au fichier des utilisateurs
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS);
    var sheetUsers = ss.getSheetByName(SHEET_NAMES.USERS);
    
    if (!sheetUsers) {
      console.error("Feuille CMDutilisateurs introuvable");
      return { actifs: 0, total: 0 };
    }

    // Obtenir les en-têtes
    var headers = sheetUsers.getRange(1, 1, 1, sheetUsers.getLastColumn()).getValues()[0];
    var colonnes = {
      role: headers.findIndex(header => header.trim() === "Role"),
      heureConnexion: headers.indexOf("HeureConnexion"),
      heureDeconnexion: headers.indexOf("HeureDeconnexion")
    };

    // Vérifier les colonnes essentielles
    if (colonnes.role === -1 || colonnes.heureConnexion === -1) {
      console.error("Colonnes manquantes dans CMDutilisateurs");
      return { actifs: 0, total: 0 };
    }

    // Obtenir toutes les données
    var lastRow = sheetUsers.getLastRow();
    if (lastRow <= 1) return { actifs: 0, total: 0 };

    var allData = sheetUsers.getRange(2, 1, lastRow - 1, sheetUsers.getLastColumn()).getValues();
    var maintenant = new Date();
    
    // Compter uniquement les opérateurs connectés
    var operateursConnectes = 0;
    var totalOperateurs = 0;

    for (var i = 0; i < allData.length; i++) {
      var role = allData[i][colonnes.role];
      if (role && role.toString().trim().toLowerCase() === "operateur") {
        totalOperateurs++;
        
        // Vérifier si l'opérateur est connecté
        var heureConnexion = allData[i][colonnes.heureConnexion];
        var heureDeconnexion = allData[i][colonnes.heureDeconnexion];
        
        if (heureConnexion && !heureDeconnexion) {
          operateursConnectes++;
        }
      }
    }

    return {
      actifs: operateursConnectes,
      total: totalOperateurs,
      timestamp: maintenant.toISOString()
    };

  } catch(e) {
    console.error("Erreur dans getOperateursStats:", e);
    return { actifs: 0, total: 0 };
  }
}

/**
 * Obtenir les données pour le graphique d'évolution
 */
function getEvolutionData(periode) {
  try {
    var user = Session.getActiveUser().getEmail();
    if (!user) {
      return { error: "Utilisateur non connecté" };
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_INT);
    var sheetCMDInit = ss.getSheetByName(SHEET_NAMES.INIT);
    
    if (!sheetCMDInit) {
      return { error: "Feuille CMDInit introuvable" };
    }

    var headers = sheetCMDInit.getRange(1, 1, 1, sheetCMDInit.getLastColumn()).getValues()[0];
    var dateCreationIndex = headers.indexOf("Date Création");

    if (dateCreationIndex === -1) {
      return { error: "Colonne Date Création introuvable" };
    }

    var lastRow = sheetCMDInit.getLastRow();
    if (lastRow <= 1) {
      return { labels: [], data: [] };
    }

    var allData = sheetCMDInit.getRange(2, 1, lastRow - 1, sheetCMDInit.getLastColumn()).getValues();
    var dateMap = new Map();

    // Définir la période
    var maintenant = new Date();
    var debut = new Date(maintenant);
    var format;

    switch(periode.toLowerCase()) {
      case "jour":
        debut.setHours(maintenant.getHours() - 24);
        format = "HH:00";
        break;
      case "semaine":
        debut.setDate(maintenant.getDate() - 7);
        format = "dd/MM";
        break;
      case "mois":
        debut.setMonth(maintenant.getMonth() - 1);
        format = "dd/MM";
        break;
      default:
        debut.setHours(maintenant.getHours() - 24);
        format = "HH:00";
    }

    // Compter les commandes par période
    for (var i = 0; i < allData.length; i++) {
      var dateCreation = allData[i][dateCreationIndex];
      if (dateCreation instanceof Date && !isNaN(dateCreation.getTime()) && dateCreation >= debut) {
        var key = Utilities.formatDate(dateCreation, Session.getScriptTimeZone(), format);
        dateMap.set(key, (dateMap.get(key) || 0) + 1);
      }
    }

    // Convertir en tableaux pour le graphique
    var labels = Array.from(dateMap.keys());
    var data = Array.from(dateMap.values());

    return {
      labels: labels,
      data: data,
      timestamp: maintenant.toISOString()
    };

  } catch(e) {
    console.error("Erreur dans getEvolutionData:", e);
    return { error: e.toString() };
  }
}
