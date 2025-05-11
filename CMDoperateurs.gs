// Fichier contenant les fonctions pour la gestion des opérateurs (admin)

/**
 * Obtenir la liste des opérateurs avec leur statut
 */
function getOperateurs() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS);
    var sheet = ss.getSheetByName(SHEET_NAMES.USERS);
    
    if (!sheet) {
      return { error: "Feuille CMDutilisateurs introuvable" };
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    // Trouver les indices des colonnes
    var colNom = headers.indexOf("Nom");
    var colRole = headers.indexOf("Role");
    var colHeureConnexion = headers.indexOf("HeureConnexion");
    var colHeureDeconnexion = headers.indexOf("HeureDeconnexion");
    var colDerniereDeconnexion = headers.indexOf("DerniereDeconnexion");
    
    // Si les colonnes n'existent pas, utiliser les indices par défaut
    if (colNom === -1) colNom = 0;
    if (colRole === -1) colRole = 1;
    if (colHeureConnexion === -1) colHeureConnexion = 3;
    if (colHeureDeconnexion === -1) colHeureDeconnexion = 4;
    if (colDerniereDeconnexion === -1) colDerniereDeconnexion = 5;
    
    var operateurs = [];
    var operateursConnectes = 0;
    
    // Parcourir les données en commençant à la ligne 1 (après les en-têtes)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[colNom]) continue; // Ignorer les lignes vides
      
      // Formater les dates
      var heureConnexion = formatDateForOutput(row[colHeureConnexion]);
      var heureDeconnexion = formatDateForOutput(row[colHeureDeconnexion]);
      var derniereDeconnexion = formatDateForOutput(row[colDerniereDeconnexion]);
      
      // Vérifier si l'opérateur est actif
      var estActif = isOperateurActif(heureConnexion, heureDeconnexion);
      if (estActif) operateursConnectes++;
      
      operateurs.push({
        nom: row[colNom],
        role: row[colRole],
        heureConnexion: heureConnexion,
        heureDeconnexion: heureDeconnexion,
        derniereDeconnexion: derniereDeconnexion,
        estActif: estActif
      });
    }
    
    console.log("Nombre d'opérateurs connectés:", operateursConnectes);
    
    return {
      operateurs: operateurs,
      total: operateurs.length,
      connectes: operateursConnectes
    };
  } catch(e) {
    console.error("Erreur dans getOperateurs:", e);
    return { error: e.toString() };
  }
}

/**
 * Formater une date pour la sortie
 */
function formatDateForOutput(date) {
  if (!date) return null;
  try {
    // Si c'est une chaîne au format dd/MM/yyyy HH:mm:ss
    if (typeof date === 'string') {
      // Vérifier si la date est au format dd/MM/yyyy HH:mm:ss
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
      const match = date.match(regex);
      
      if (match) {
        const [_, day, month, year, hours, minutes, seconds] = match;
        const dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
        if (!isNaN(dateObj.getTime())) {
          return date; // Retourner le format original s'il est valide
        }
      }
      
      // Si le format n'est pas reconnu, essayer de parser la date
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
      }
    }
    
    // Si c'est un objet Date
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        console.log("Date invalide:", date);
        return null;
      }
      return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    }
    
    console.log("Format de date non reconnu:", date);
    return null;
  } catch(e) {
    console.error("Erreur formatage date:", e);
    return null;
  }
}

/**
 * Vérifie si un opérateur est actif basé sur son état de connexion
 * @param {Object|string} heureConnexion - Heure de connexion ou objet opérateur
 * @param {string} [heureDeconnexion] - Heure de déconnexion (optionnel si heureConnexion est un objet)
 * @return {boolean} True si l'opérateur est actuellement connecté
 */
function isOperateurActif(heureConnexion, heureDeconnexion) {
  try {
    // Si pas d'heure de connexion, l'opérateur n'est pas actif
    if (!heureConnexion) {
      return false;
    }
    
    // Si l'opérateur a une heure de déconnexion, il n'est pas actif
    if (heureDeconnexion) {
      return false;
    }
    
    // Vérifier si l'heure de connexion est valide
    let dateConnexion;
    if (typeof heureConnexion === 'string') {
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
      const match = heureConnexion.match(regex);
      
      if (match) {
        const [_, day, month, year, hours, minutes, seconds] = match;
        dateConnexion = new Date(year, month - 1, day, hours, minutes, seconds);
      } else {
        dateConnexion = new Date(heureConnexion);
      }
    } else if (heureConnexion instanceof Date) {
      dateConnexion = heureConnexion;
    }
    
    if (!dateConnexion || isNaN(dateConnexion.getTime())) {
      console.log("Date de connexion invalide:", heureConnexion);
      return false;
    }
    
    // L'opérateur est actif s'il a une heure de connexion valide sans heure de déconnexion
    return true;
  } catch(e) {
    console.error("Erreur dans isOperateurActif:", e);
    return false;
  }
}

/**
 * Convertit une heure au format HH:mm:ss ou HH:mm en objet Date
 * @param {string|Date} heure - Heure au format HH:mm:ss, HH:mm ou objet Date
 * @return {Date|null} Objet Date ou null si format invalide
 */
function convertirHeureEnDate(heure) {
  if (!heure) return null;
  
  try {
    const maintenant = new Date();
    
    // Si c'est déjà un objet Date, le retourner directement
    if (heure instanceof Date) {
      return heure;
    }
    
    // Si c'est une chaîne de caractères
    if (typeof heure === 'string') {
      // Si c'est un format HH:mm:ss ou HH:mm
      if (heure.includes(':')) {
        const [heures, minutes, secondes = "00"] = heure.split(":");
        
        // Vérifier si les valeurs sont valides
        const h = parseInt(heures, 10);
        const m = parseInt(minutes, 10);
        const s = parseInt(secondes, 10);
        
        if (isNaN(h) || isNaN(m) || isNaN(s)) {
          console.log("Format d'heure invalide:", heure);
          return null;
        }
        
        return new Date(
          maintenant.getFullYear(),
          maintenant.getMonth(),
          maintenant.getDate(),
          h, m, s
        );
      }
    }
    
    return null;
    
  } catch(e) {
    console.error("Erreur conversion heure:", e);
    return null;
  }
}

/**
 * Ajoute un nouvel opérateur
 * @param {Object} operateurData - Données du nouvel opérateur
 * @return {Object} Résultat de l'opération
 */
function ajouterOperateur(operateurData) {
  try {
    var user = getActiveUser();
    var role = getRole(user);
    
    if (!user) {
      return { error: "Utilisateur non connecté" };
    }
    
    if (role !== 'admin') {
      return { error: "Accès non autorisé" };
    }
    
    // Vérifier les données obligatoires
    if (!operateurData.nom || !operateurData.role || !operateurData.password) {
      return { error: "Tous les champs sont obligatoires" };
    }
    
    // Vérifier la longueur du mot de passe
    if (operateurData.password.length < 8) {
      return { error: "Le mot de passe doit contenir au moins 8 caractères" };
    }
    
    // Accéder au fichier Google Sheet
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS);
    var sheetUsers = ss.getSheetByName("CMDutilisateurs");
    
    if (!sheetUsers) {
      return { error: "Feuille CMDutilisateurs introuvable" };
    }
    
    // Obtenir les en-têtes
    var headers = sheetUsers.getRange(1, 1, 1, sheetUsers.getLastColumn()).getValues()[0];
    
    // Trouver les indices des colonnes
    var colonnes = {
      nom: headers.indexOf("Nom"),
      role: headers.findIndex(header => header.trim() === "Role"),
      password: headers.indexOf("Password")
    };
    
    // Vérifier les colonnes essentielles
    var colsManquantes = [];
    for (var col in colonnes) {
      if (colonnes[col] === -1) {
        colsManquantes.push(col);
      }
    }
    
    if (colsManquantes.length > 0) {
      return { 
        error: "Colonnes manquantes dans CMDutilisateurs: " + colsManquantes.join(", "), 
        success: false 
      };
    }
    
    // Vérifier si le nom existe déjà
    var lastRow = sheetUsers.getLastRow();
    if (lastRow > 1) {
      var existingData = sheetUsers.getRange(2, colonnes.nom + 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < existingData.length; i++) {
        if (existingData[i][0].toString().toLowerCase() === operateurData.nom.toLowerCase()) {
          return { error: "Un opérateur avec ce nom existe déjà" };
        }
      }
    }
    
    // Préparer la nouvelle ligne
    var newRow = Array(headers.length).fill("");
    newRow[colonnes.nom] = operateurData.nom;
    newRow[colonnes.role] = operateurData.role;
    newRow[colonnes.password] = operateurData.password;
    
    // Ajouter la nouvelle ligne
    sheetUsers.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    
    // Formater la nouvelle ligne
    var newRange = sheetUsers.getRange(lastRow + 1, 1, 1, newRow.length);
    newRange.setBackground("#f8f9fa");
    newRange.setBorder(true, true, true, true, true, true, "#dee2e6", SpreadsheetApp.BorderStyle.SOLID);
    
    return {
      success: true,
      message: "Opérateur ajouté avec succès"
    };
    
  } catch(e) {
    Logger.log("Erreur dans ajouterOperateur: " + e.toString());
    return { error: e.toString() };
  }
}

/**
 * Charger les commandes assignées à l'opérateur actif
 */
function getCommandesOperateurActif() {
  var activeUser = getActiveUser();
  var role = getRole(activeUser);
  
  if (!activeUser || role !== 'opérateur') {
    return { error: 'Accès non autorisé' };
  }
  
  return getCommandesOperateur(activeUser);
}

// Mettre à jour le statut d'une commande par un opérateur
function updateCommandeStatusOperateur(numeroCommande, nouveauStatut) {
  var activeUser = getActiveUser();
  var role = getRole(activeUser);
  
  if (!activeUser || role !== 'opérateur') {
    return { error: 'Accès non autorisé' };
  }
  
  // Vérifier que la commande est bien assignée à cet opérateur
  var sheet = SpreadsheetApp.openById('1nhEpjRtGOBnwXLY8CBtcsMg1Cbfu-pox3ylraFoCg4c').getSheetByName('CMDInit');
  var data = sheet.getDataRange().getValues();
  var commandeTrouvee = false;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === numeroCommande) {
      if (data[i][2] !== activeUser) {
        return { error: 'Cette commande n\'est pas assignée à votre compte' };
      }
      
      // Vérifier que le nouveau statut est autorisé pour un opérateur
      if (nouveauStatut === 'Annulé') {
        return { error: 'Seul un administrateur peut annuler une commande' };
      }
      
      // Mettre à jour le statut
      sheet.getRange(i + 1, 2).setValue(nouveauStatut);
      
      // Journaliser l'action
      logAction(activeUser, 'Mise à jour du statut de la commande ' + numeroCommande + ' à ' + nouveauStatut);
      
      commandeTrouvee = true;
      break;
    }
  }
  
  if (!commandeTrouvee) {
    return { error: 'Commande non trouvée' };
  }
  
  return { success: true };
}

/**
 * Obtenir l'utilisateur actif
 */
function getActiveUser() {
  try {
    // Retourner le nom d'utilisateur à partir de la session
    var username = Session.getActiveUser().getUserLoginId();
    return username || null;
  } catch(e) {
    return null;
  }
}

/**
 * Obtenir le rôle de l'utilisateur
 * @param {string} user - Nom de l'utilisateur
 * @return {string|null} Le rôle de l'utilisateur ou null si non trouvé
 */
function getRole(user) {
  if (!user) return null;
  
  try {
    // Pour le développement, retourner 'admin' par défaut
    return 'admin';
    
    /* Code à utiliser en production :
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS);
    var sheetUsers = ss.getSheetByName("CMDutilisateurs");
    
    if (!sheetUsers) return null;
    
    var data = sheetUsers.getDataRange().getValues();
    var headers = data[0];
    var nomCol = headers.indexOf("Nom");
    var roleCol = headers.indexOf("Role");
    
    if (nomCol === -1 || roleCol === -1) return null;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][nomCol] === user) {
        return data[i][roleCol];
      }
    }
    */
    
    return null;
  } catch(e) {
    Logger.log("Erreur dans getRole: " + e.toString());
    return null;
  }
}

/**
 * Récupérer la liste des opérateurs disponibles
 * @return {Object} Liste des opérateurs ou erreur
 */
function getOperateursDisponibles() {
  try {
    // Accéder au fichier des utilisateurs
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS);
    var sheetUsers = ss.getSheetByName(SHEET_NAMES.USERS);
    
    if (!sheetUsers) {
      return { error: "Feuille CMDutilisateurs introuvable", operateurs: [] };
    }
    
    // Obtenir toutes les données
    var lastRow = sheetUsers.getLastRow();
    var data = sheetUsers.getRange(2, 1, lastRow - 1, 2).getValues(); // Lire seulement Nom et Role
    var operateurs = [];
    
    // Filtrer les opérateurs
    for (var i = 0; i < data.length; i++) {
      if (data[i][1].toLowerCase() === "operateur") {
        operateurs.push({
          nom: data[i][0],
          value: data[i][0]
        });
      }
    }
    
    return { 
      success: true,
      operateurs: operateurs
    };
  } catch(e) {
    console.error("Erreur dans getOperateursDisponibles:", e);
    return { error: e.toString(), operateurs: [] };
  }
}

function verifierOperateur(operateur) {
  try {
    // Accéder au fichier des utilisateurs
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS);
    var sheetUsers = ss.getSheetByName(SHEET_NAMES.USERS);
    
    if (!sheetUsers) {
      return { error: "Feuille CMDutilisateurs introuvable", success: false };
    }
    
    // Obtenir toutes les données
    var lastRow = sheetUsers.getLastRow();
    var data = sheetUsers.getRange(2, 1, lastRow - 1, 2).getValues(); // Lire seulement Nom et Role
    
    // Rechercher l'opérateur
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === operateur && data[i][1].toLowerCase() === "operateur") {
        return { success: true };
      }
    }
    
    return { error: "Opérateur non trouvé ou non autorisé", success: false };
  } catch(e) {
    console.error("Erreur dans verifierOperateur:", e);
    return { error: e.toString(), success: false };
  }
}

/**
 * Affecte plusieurs commandes à un opérateur
 * @param {string} operateurId - ID de l'opérateur
 * @param {Array} commandeIds - Liste des IDs des commandes
 * @return {Object} Résultat de l'opération
 */
function affecterCommandesMultiples(operateurId, commandeIds) {
  try {
    // Vérification des droits
    var user = getActiveUser();
    if (!isAdmin(user)) {
      return { error: "Accès non autorisé" };
    }

    // Vérification de l'opérateur
    var operateur = verifierOperateur(operateurId);
    if (!operateur.success) {
      return { error: "Opérateur invalide" };
    }

    // Création/accès à la feuille de l'opérateur
    var feuilleOperateur = creerOuObtenirFeuilleOperateur(operateur.nom);
    
    // Affectation des commandes
    var resultats = commandeIds.map(cmdId => {
      return affecterCommande(cmdId, operateur.nom, feuilleOperateur);
    });

    return {
      success: true,
      message: `${resultats.length} commandes affectées à ${operateur.nom}`,
      resultats: resultats
    };
    
  } catch(e) {
    Logger.log("Erreur dans affecterCommandesMultiples: " + e.toString());
    return { error: "Erreur lors de l'affectation multiple: " + e.message };
  }
}

/**
 * Crée ou obtient la feuille d'un opérateur
 * @param {string} nomOperateur - Nom de l'opérateur
 * @return {Sheet} Feuille Google Sheets
 */
function creerOuObtenirFeuilleOperateur(nomOperateur) {
  var ss = SpreadsheetApp.getActive();
  var nomFeuille = `CMD_${nomOperateur}`;
  var feuille = ss.getSheetByName(nomFeuille);
  
  if (!feuille) {
    feuille = ss.insertSheet(nomFeuille);
    // Initialisation des en-têtes
    feuille.getRange(1, 1, 1, 5).setValues([["ID", "Date", "Client", "Statut", "Commentaire"]]);
  }
  
  return feuille;
}

/**
 * NOTE IMPORTANTE:
 * La fonction creerFeuilleCMDOperateur est définie dans CMDinit.gs
 * Elle est utilisée pour copier les commandes de CMDInit vers les feuilles des opérateurs
 * lors de l'affectation des commandes.
 * 
 * Ne pas recréer cette fonction ici pour éviter les conflits.
 */

/**
 * Récupère les commandes affectées à un opérateur spécifique
 * @param {string} operateur - Nom de l'opérateur
 * @return {Object} Résultat contenant les commandes ou une erreur
 */
function getCommandesOperateur(operateur) {
  try {
    // Vérifier que l'opérateur existe
    var verifOperateur = verifierOperateur(operateur);
    if (!verifOperateur.success) {
      return { 
        error: "Opérateur non trouvé ou non autorisé",
        commandes: []
      };
    }
    
    // Accéder au fichier des opérateurs
    var ssOperateurs = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS);
    var sheetName = "CMD_" + operateur.toUpperCase();
    
    // Vérifier si la feuille existe
    var sheet = ssOperateurs.getSheetByName(sheetName);
    if (!sheet) {
      return {
        success: true,
        commandes: [],
        message: "Aucune commande trouvée"
      };
    }
    
    // Obtenir les en-têtes
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colonnes = {
      cmdNum: headers.indexOf("N° Commande"),
      statut: headers.indexOf("Statut"),
      client: headers.indexOf("Client"),
      telephone: headers.indexOf("Téléphone"),
      adresse: headers.indexOf("Adresse"),
      ville: headers.indexOf("Ville"),
      produit: headers.indexOf("Produit"),
      quantite: headers.indexOf("Quantité"),
      prix: headers.indexOf("Prix"),
      dateCreation: headers.indexOf("Date Création"),
      motifs: headers.indexOf("Motifs")
    };
    
    // Vérifier les colonnes essentielles
    var colsManquantes = [];
    for (var col in colonnes) {
      if (colonnes[col] === -1) {
        colsManquantes.push(col);
      }
    }
    
    if (colsManquantes.length > 0) {
      return { 
        error: "Structure de la feuille invalide. Colonnes manquantes: " + colsManquantes.join(", "),
        commandes: []
      };
    }
    
    // Récupérer toutes les données
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return {
        success: true,
        commandes: [],
        message: "Aucune commande trouvée"
      };
    }
    
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    var commandes = [];
    
    // Convertir les données en objets
    for (var i = 0; i < data.length; i++) {
      var commande = {
        cmdNum: data[i][colonnes.cmdNum],
        statut: data[i][colonnes.statut],
        client: data[i][colonnes.client],
        telephone: data[i][colonnes.telephone],
        adresse: data[i][colonnes.adresse],
        ville: data[i][colonnes.ville],
        produit: data[i][colonnes.produit],
        quantite: data[i][colonnes.quantite],
        prix: data[i][colonnes.prix],
        dateCreation: data[i][colonnes.dateCreation],
        motifs: data[i][colonnes.motifs],
        rowNum: i + 2
      };
      commandes.push(commande);
    }
    
    // Trier les commandes par date de création (plus récentes en premier)
    commandes.sort((a, b) => {
      var dateA = new Date(a.dateCreation);
      var dateB = new Date(b.dateCreation);
      return dateB - dateA;
    });
    
    return {
      success: true,
      commandes: commandes,
      total: commandes.length
    };
    
  } catch(e) {
    console.error("Erreur dans getCommandesOperateur:", e);
    return { 
      error: e.toString(),
      commandes: []
    };
  }
}

// Fonction pour vérifier si un utilisateur existe
function checkUserExists(username) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS).getSheetByName(SHEET_NAMES.USERS);
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

// Journaliser les actions dans CMDlog
function logAction(username, action) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_USERS).getSheetByName(SHEET_NAMES.LOG);
    var date = new Date();
    sheet.appendRow([date, username, action]);
  } catch (e) {
    console.error('Erreur de journalisation: ' + e.toString());
  }
}

function getInitData() {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_IDS.CMD_INT).getSheetByName(SHEET_NAMES.INIT);
    // ... existing code ...
  } catch(e) {
    console.error("Erreur dans getInitData:", e);
    return { error: e.toString() };
  }
} 