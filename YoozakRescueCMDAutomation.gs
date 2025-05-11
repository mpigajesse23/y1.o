/**
 * YoozakRescueCMDAutomation
 * 
 * Fonction déclenchée automatiquement pour consolider les commandes des feuilles 
 * CMD YooCan et CMD Shopify vers la feuille centrale CMDInit.
 * 
 * Fonctionnalités:
 * 1. Consolidation des commandes (mapping des colonnes)
 * 2. Vérification des doublons (dans les 100 dernières lignes)
 * 3. Contrôle qualité des données (validation des numéros de téléphone)
 * 4. Attribution d'identifiants uniques (YCN-xxxxx, SHP-xxxxx)
 * 5. Exécution automatique chaque minute
 * 6. Mise en cache des données pour optimiser les performances
 */

// Utilise la constante CMD_INT_SPREADSHEET_ID déjà définie dans CMDinit.gs
// Si elle n'est pas définie, définissons un ID de secours
if (typeof CMD_INT_SPREADSHEET_ID === 'undefined') {
  var YOOZAK_SPREADSHEET_ID = "1xOgqtA-bXGE1zodIGoAer8A2rloofFVIlqTpmaaqANc";
}

function YoozakRescueCMDAutomation() {
  const startTime = new Date().getTime();
  Logger.log("Début de l'exécution à " + new Date());
  
  try {
    // Réinitialiser le cache des entrées de session
    resetDuplicateSessionCache();
    
    // Accès au fichier Google Sheet
    let ss;
    try {
      // D'abord, essayer d'obtenir le classeur actif
      ss = SpreadsheetApp.getActive();
      Logger.log("Utilisation du classeur actif");
      
      // Si null, essayer l'autre méthode
      if (!ss) {
        // Utiliser la constante globale si elle existe, sinon la nôtre
        const spreadsheetId = typeof CMD_INT_SPREADSHEET_ID !== 'undefined' ? 
                             CMD_INT_SPREADSHEET_ID : YOOZAK_SPREADSHEET_ID;
        
        ss = SpreadsheetApp.openById(spreadsheetId);
        Logger.log("Utilisation du classeur par ID: " + spreadsheetId);
      }
      
      if (!ss) {
        throw new Error("Impossible d'accéder au fichier Google Sheet");
      }
    } catch (e) {
      Logger.log("Erreur lors de l'accès au fichier: " + e.toString());
      throw new Error("Impossible d'accéder au Google Sheet: " + e.toString());
    }
    
    // Accès aux feuilles avec vérification
    const sheetYooCan = ss.getSheetByName("CMD YooCan");
    const sheetShopify = ss.getSheetByName("CMD Shopify");
    const sheetCMDInit = ss.getSheetByName("CMDInit");
    
    // Vérification de l'existence des feuilles principales
    if (!sheetYooCan) throw new Error("Feuille 'CMD YooCan' introuvable");
    if (!sheetShopify) throw new Error("Feuille 'CMD Shopify' introuvable");
    if (!sheetCMDInit) throw new Error("Feuille 'CMDInit' introuvable");
    
    // Accès ou création de la feuille de log
    let sheetCMDLog = ss.getSheetByName("CMDlog");
    
    if (!sheetCMDLog) {
      // Si la feuille n'existe pas, la créer avec les en-têtes nécessaires
      sheetCMDLog = initCMDLogSheet(ss);
    }
    
    // Récupération des informations du log
    const logInfo = getLogInfo(sheetCMDLog);
    const lastYooCanRow = logInfo.yoocan.lastRow;
    const lastShopifyRow = logInfo.shopify.lastRow;
    const lastYooCanID = logInfo.yoocan.lastID;
    const lastShopifyID = logInfo.shopify.lastID;
    
    Logger.log("Dernière ligne YooCan traitée: " + lastYooCanRow);
    Logger.log("Dernier ID YooCan généré: " + lastYooCanID);
    Logger.log("Dernière ligne Shopify traitée: " + lastShopifyRow);
    Logger.log("Dernier ID Shopify généré: " + lastShopifyID);
    
    // Obtention des en-têtes et données
    const yoocanHeader = sheetYooCan.getRange(1, 1, 1, sheetYooCan.getLastColumn()).getValues()[0];
    const shopifyHeader = sheetShopify.getRange(1, 1, 1, sheetShopify.getLastColumn()).getValues()[0];
    const cmdInitHeader = sheetCMDInit.getRange(1, 1, 1, sheetCMDInit.getLastColumn()).getValues()[0];
    
    // Traitement des commandes YooCan avec le dernier ID généré
    const yooCanResult = processYooCanOrders(sheetYooCan, sheetCMDInit, yoocanHeader, cmdInitHeader, lastYooCanRow, lastYooCanID);
    
    // Traitement des commandes Shopify avec le dernier ID généré
    const shopifyResult = processShopifyOrders(sheetShopify, sheetCMDInit, shopifyHeader, cmdInitHeader, lastShopifyRow, lastShopifyID);
    
    // Mise à jour finale des logs
    if (yooCanResult.newLastRow > lastYooCanRow || yooCanResult.newLastID !== lastYooCanID) {
      updateSourceLog(sheetCMDLog, "YooCan", yooCanResult.newLastRow, yooCanResult.newLastID);
      Logger.log("CMDlog mis à jour pour YooCan - Dernière ligne: " + yooCanResult.newLastRow + ", Dernier ID: " + yooCanResult.newLastID);
    }
    
    if (shopifyResult.newLastRow > lastShopifyRow || shopifyResult.newLastID !== lastShopifyID) {
      updateSourceLog(sheetCMDLog, "Shopify", shopifyResult.newLastRow, shopifyResult.newLastID);
      Logger.log("CMDlog mis à jour pour Shopify - Dernière ligne: " + shopifyResult.newLastRow + ", Dernier ID: " + shopifyResult.newLastID);
    }
    
    const endTime = new Date().getTime();
    Logger.log("Fin de l'exécution à " + new Date() + " - Durée: " + ((endTime - startTime) / 1000) + " secondes");
    
  } catch (error) {
    Logger.log("ERREUR dans YoozakRescueCMDAutomation: " + error.message + "\n" + error.stack);
    // Option: envoyer un email de notification en cas d'erreur critique
    // MailApp.sendEmail("email@example.com", "Erreur YoozakRescue", "Une erreur s'est produite: " + error.message);
  }
}

/**
 * Initialise la feuille CMDlog avec les en-têtes nécessaires
 * 
 * @param {Spreadsheet} ss - Objet Spreadsheet 
 * @return {Sheet} - Feuille CMDlog créée
 */
function initCMDLogSheet(ss) {
  const sheetCMDLog = ss.insertSheet("CMDlog");
  
  // Définir les en-têtes
  const headers = ["Source", "ID_derniere_ligne", "Horodateur", "Dernier_ID_genere"];
  sheetCMDLog.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Initialisation du log avec des valeurs de départ
  sheetCMDLog.appendRow(["YooCan", 0, new Date(), "000000"]);
  sheetCMDLog.appendRow(["Shopify", 0, new Date(), "000000"]);
  
  // Formater la feuille pour une meilleure lisibilité
  sheetCMDLog.setColumnWidth(1, 120); // Source
  sheetCMDLog.setColumnWidth(2, 120); // ID_derniere_ligne
  sheetCMDLog.setColumnWidth(3, 200); // Horodateur
  sheetCMDLog.setColumnWidth(4, 150); // Dernier_ID_genere
  
  // Mettre les en-têtes en gras
  sheetCMDLog.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  
  return sheetCMDLog;
}

/**
 * Récupère les informations de log pour YooCan et Shopify
 * 
 * @param {Sheet} sheetCMDLog - Feuille de log
 * @return {Object} - Objet contenant les informations pour YooCan et Shopify
 */
function getLogInfo(sheetCMDLog) {
  const result = {
    yoocan: {
      lastRow: 0,
      lastID: "000000"
    },
    shopify: {
      lastRow: 0,
      lastID: "000000"
    }
  };
  
  // Vérifier si la feuille est vide ou contient uniquement l'en-tête
  const lastRow = sheetCMDLog.getLastRow();
  if (lastRow <= 1) {
    return result;
  }
  
  // Obtenir les en-têtes
  const headers = sheetCMDLog.getRange(1, 1, 1, sheetCMDLog.getLastColumn()).getValues()[0];
  
  // Trouver les indices des colonnes nécessaires
  const sourceIndex = 0; // La première colonne est toujours "Source"
  const lastRowIndex = headers.indexOf("ID_derniere_ligne");
  const lastIDIndex = headers.indexOf("Dernier_ID_genere");
  
  // Si la colonne "Dernier_ID_genere" n'existe pas, l'ajouter
  if (lastIDIndex === -1) {
    const lastCol = sheetCMDLog.getLastColumn() + 1;
    sheetCMDLog.getRange(1, lastCol).setValue("Dernier_ID_genere");
    
    // Initialiser la colonne avec des valeurs par défaut
    const range = sheetCMDLog.getRange(2, lastCol, lastRow - 1, 1);
    const values = Array(lastRow - 1).fill(["000000"]);
    range.setValues(values);
    
    // Récupérer les nouveaux en-têtes
    const newHeaders = sheetCMDLog.getRange(1, 1, 1, sheetCMDLog.getLastColumn()).getValues()[0];
    const newLastIDIndex = newHeaders.indexOf("Dernier_ID_genere");
    
    // Récupérer toutes les données
    const allData = sheetCMDLog.getRange(2, 1, lastRow - 1, sheetCMDLog.getLastColumn()).getValues();
    
    // Parcourir les données pour extraire les informations
    for (let i = 0; i < allData.length; i++) {
      const source = allData[i][sourceIndex];
      const lastRowValue = lastRowIndex !== -1 ? allData[i][lastRowIndex] : 0;
      
      if (source === "YooCan") {
        result.yoocan.lastRow = parseInt(lastRowValue) || 0;
      } else if (source === "Shopify") {
        result.shopify.lastRow = parseInt(lastRowValue) || 0;
      }
    }
  } else {
    // Récupérer toutes les données en une seule opération (plus efficace)
    const allData = sheetCMDLog.getRange(2, 1, lastRow - 1, sheetCMDLog.getLastColumn()).getValues();
    
    // Parcourir les données pour extraire les informations
    for (let i = 0; i < allData.length; i++) {
      const source = allData[i][sourceIndex];
      const lastRowValue = lastRowIndex !== -1 ? allData[i][lastRowIndex] : 0;
      const lastIDValue = lastIDIndex !== -1 ? allData[i][lastIDIndex] : "000000";
      
      if (source === "YooCan") {
        result.yoocan.lastRow = parseInt(lastRowValue) || 0;
        result.yoocan.lastID = lastIDValue ? lastIDValue.toString() : "000000";
      } else if (source === "Shopify") {
        result.shopify.lastRow = parseInt(lastRowValue) || 0;
        result.shopify.lastID = lastIDValue ? lastIDValue.toString() : "000000";
      }
    }
  }
  
  return result;
}

/**
 * Met à jour les informations de log pour une source spécifique
 * 
 * @param {Sheet} sheetCMDLog - Feuille de log
 * @param {String} source - Source (YooCan ou Shopify)
 * @param {Number} lastRow - Dernière ligne traitée
 * @param {String} lastID - Dernier ID généré
 */
function updateSourceLog(sheetCMDLog, source, lastRow, lastID) {
  // Vérifier si la source existe déjà dans le log
  const lastRowLog = sheetCMDLog.getLastRow();
  let sourceRowIndex = -1;
  
  if (lastRowLog > 1) {
    const sources = sheetCMDLog.getRange(2, 1, lastRowLog - 1, 1).getValues();
    for (let i = 0; i < sources.length; i++) {
      if (sources[i][0] === source) {
        sourceRowIndex = i + 2; // +2 car on commence à la ligne 2 et les indices de tableau commencent à 0
        break;
      }
    }
  }
  
  const horodateur = new Date();
  
  // Trouver l'indice de la colonne Dernier_ID_genere
  const headers = sheetCMDLog.getRange(1, 1, 1, sheetCMDLog.getLastColumn()).getValues()[0];
  const lastIDIndex = headers.indexOf("Dernier_ID_genere");
  
  // Si la source n'existe pas encore, l'ajouter
  if (sourceRowIndex === -1) {
    const newRow = [source, lastRow, horodateur];
    if (lastIDIndex !== -1) {
      // Si la colonne Dernier_ID_genere existe
      while (newRow.length < lastIDIndex) {
        newRow.push("");
      }
      newRow.push(lastID);
    } else {
      // Si la colonne n'existe pas, l'ajouter
      newRow.push(lastID);
      sheetCMDLog.getRange(1, newRow.length).setValue("Dernier_ID_genere");
    }
    sheetCMDLog.appendRow(newRow);
  } else {
    // Mettre à jour l'entrée existante
    const updateData = {};
    updateData[2] = lastRow;
    updateData[3] = horodateur;
    
    if (lastIDIndex !== -1) {
      // Si la colonne Dernier_ID_genere existe
      updateData[lastIDIndex + 1] = lastID;
      
      // Mise à jour en une seule opération
      const updateValues = Object.entries(updateData).map(([col, val]) => [sourceRowIndex, parseInt(col), val]);
      updateValues.forEach(([row, col, val]) => {
        sheetCMDLog.getRange(row, col).setValue(val);
      });
    } else {
      // Si la colonne n'existe pas, l'ajouter
      const newColIndex = sheetCMDLog.getLastColumn() + 1;
      sheetCMDLog.getRange(1, newColIndex).setValue("Dernier_ID_genere");
      sheetCMDLog.getRange(sourceRowIndex, newColIndex).setValue(lastID);
      
      // Mise à jour des autres valeurs
      sheetCMDLog.getRange(sourceRowIndex, 2).setValue(lastRow);
      sheetCMDLog.getRange(sourceRowIndex, 3).setValue(horodateur);
    }
  }
}

/**
 * Traitement des commandes YooCan
 * 
 * @param {Sheet} sheetYooCan - Feuille des commandes YooCan
 * @param {Sheet} sheetCMDInit - Feuille de destination CMDInit
 * @param {Array} yoocanHeader - En-têtes de la feuille YooCan
 * @param {Array} cmdInitHeader - En-têtes de la feuille CMDInit
 * @param {Number} lastProcessedRow - Dernière ligne traitée
 * @param {String} lastGeneratedID - Dernier ID généré
 * @return {Object} - Objet contenant la nouvelle dernière ligne traitée et le dernier ID généré
 */
function processYooCanOrders(sheetYooCan, sheetCMDInit, yoocanHeader, cmdInitHeader, lastProcessedRow, lastGeneratedID) {
  // Obtention des indices des colonnes dans YooCan
  const columnIndices = {
    orderId: yoocanHeader.indexOf("Order ID"),
    name: yoocanHeader.indexOf("First name"),
    phone: yoocanHeader.indexOf("Phone"),
    address: yoocanHeader.indexOf("العنوان"),
    city: yoocanHeader.indexOf("City"),
    productName: yoocanHeader.indexOf("Product name"),
    productVariant: yoocanHeader.indexOf("Product variant"),
    price: yoocanHeader.indexOf("Variant price"),
    date: yoocanHeader.indexOf("Order date"),
    productUrl: yoocanHeader.indexOf("Product URL")
  };
  
  // Obtention des indices des colonnes dans CMDInit
  const cmdIndices = {
    cmdNum: cmdInitHeader.indexOf("N° Commande"),
    status: cmdInitHeader.indexOf("Statut"),
    operator: cmdInitHeader.indexOf("Opérateur"),
    clientName: cmdInitHeader.indexOf("Client"),
    phone: cmdInitHeader.indexOf("Téléphone"),
    address: cmdInitHeader.indexOf("Adresse"),
    city: cmdInitHeader.indexOf("Ville"),
    product: cmdInitHeader.indexOf("Produit"),
    quantity: cmdInitHeader.indexOf("Quantité"),
    price: cmdInitHeader.indexOf("Prix"),
    dateCreation: cmdInitHeader.indexOf("Date Création")
  };
  
  // Vérification des colonnes essentielles
  const requiredColumns = ["phone", "product"];
  const missingColumns = requiredColumns.filter(col => cmdIndices[col] === -1);
  
  if (missingColumns.length > 0) {
    Logger.log("ERREUR: Colonnes essentielles manquantes dans CMDInit: " + missingColumns.join(", "));
    return { 
      newLastRow: lastProcessedRow, 
      newLastID: lastGeneratedID 
    };
  }
  
  // Récupération des données YooCan
  const lastRowYooCan = sheetYooCan.getLastRow();
  if (lastRowYooCan <= 1) {
    return { 
      newLastRow: lastProcessedRow, 
      newLastID: lastGeneratedID 
    }; // Pas de données à traiter
  }
  
  // Déterminer les lignes à traiter (nouvelles commandes après la dernière ligne traitée)
  const startRow = Math.max(2, lastProcessedRow + 1);
  if (startRow > lastRowYooCan) {
    return { 
      newLastRow: lastProcessedRow, 
      newLastID: lastGeneratedID 
    }; // Pas de nouvelles commandes
  }
  
  const numRows = lastRowYooCan - startRow + 1;
  const yoocanData = sheetYooCan.getRange(startRow, 1, numRows, yoocanHeader.length).getValues();
  
  // Si aucune donnée à traiter
  if (yoocanData.length === 0) {
    return { 
      newLastRow: lastProcessedRow, 
      newLastID: lastGeneratedID 
    };
  }
  
  // Initialiser le dernier ID généré
  let currentID = parseInt(lastGeneratedID) || 0;
  let newLastProcessedRow = lastProcessedRow;
  
  // Traiter ligne par ligne pour une meilleure synchronisation des doublons
  // et construire le tableau de lignes au fur et à mesure
  let lastRow = sheetCMDInit.getLastRow();
  
  // Préparer un tableau pour stocker les nouvelles lignes ajoutées
  // et les informations de formatage correspondantes
  const processedRows = [];
  
  // Traitement des commandes à ajouter
  for (let i = 0; i < yoocanData.length; i++) {
    const order = yoocanData[i];
    const currentRowNumber = startRow + i;
    
    // Mise à jour de la dernière ligne traitée
    newLastProcessedRow = currentRowNumber;
    
    // Incrémenter l'ID et formater avec des zéros à gauche
    currentID++;
    const formattedID = currentID.toString().padStart(6, '0');
    const newId = "YCN-" + formattedID;
    
    // Préparation des données pour CMDInit
    const newRow = Array(cmdInitHeader.length).fill("");
    
    // Mapping des colonnes - ajustement selon les en-têtes exacts
    if (cmdIndices.cmdNum !== -1) {
      newRow[cmdIndices.cmdNum] = newId; // Identifiant unique au format YCN-000001
    }
    
    if (cmdIndices.status !== -1) {
      newRow[cmdIndices.status] = "Non affectée"; // État par défaut
    }
    
    // Client (First name de YooCan)
    if (cmdIndices.clientName !== -1 && columnIndices.name !== -1 && columnIndices.name < order.length) {
      newRow[cmdIndices.clientName] = order[columnIndices.name] || "";
    }
    
    // Téléphone (Phone de YooCan)
    let phoneValue = "";
    if (cmdIndices.phone !== -1 && columnIndices.phone !== -1 && columnIndices.phone < order.length) {
      phoneValue = order[columnIndices.phone] ? order[columnIndices.phone].toString() : "";
      newRow[cmdIndices.phone] = phoneValue;
    }
    
    // Adresse (العنوان de YooCan)
    if (cmdIndices.address !== -1 && columnIndices.address !== -1 && columnIndices.address < order.length) {
      newRow[cmdIndices.address] = order[columnIndices.address] || "";
    }
    
    // Ville (City de YooCan)
    if (cmdIndices.city !== -1 && columnIndices.city !== -1 && columnIndices.city < order.length) {
      newRow[cmdIndices.city] = order[columnIndices.city] || "";
    }
    
    // Produit (Product name + Product variant de YooCan)
    let productValue = "";
    if (cmdIndices.product !== -1) {
      let productName = "";
      if (columnIndices.productName !== -1 && columnIndices.productName < order.length) {
        productName = order[columnIndices.productName] || "";
      }
      
      let productVariant = "";
      if (columnIndices.productVariant !== -1 && columnIndices.productVariant < order.length) {
        productVariant = order[columnIndices.productVariant] || "";
      }
      
      productValue = productName + (productVariant ? " - " + productVariant : "");
      newRow[cmdIndices.product] = productValue;
    }
    
    // Quantité (défaut à 1)
    if (cmdIndices.quantity !== -1) {
      newRow[cmdIndices.quantity] = 1;
    }
    
    // Prix (Variant price de YooCan)
    if (cmdIndices.price !== -1 && columnIndices.price !== -1 && columnIndices.price < order.length) {
      newRow[cmdIndices.price] = order[columnIndices.price] || "";
    }
    
    // Date Création (Order date de YooCan)
    if (cmdIndices.dateCreation !== -1 && columnIndices.date !== -1 && columnIndices.date < order.length) {
      newRow[cmdIndices.dateCreation] = order[columnIndices.date] || "";
    }
    
    // Vérification du numéro de téléphone
    let status = "Non affectée";
    if (!isValidPhoneNumber(phoneValue) && cmdIndices.status !== -1) {
      status = "Erronée";
      newRow[cmdIndices.status] = status;
    }
    
    // Vérification des doublons - maintenant fait de façon synchronisée
    if (checkForDuplicates(sheetCMDInit, phoneValue, productValue) && cmdIndices.status !== -1) {
      status = "Doublon";
      newRow[cmdIndices.status] = status;
    }
    
    // Ajouter la ligne à la feuille immédiatement
    lastRow++;
    sheetCMDInit.getRange(lastRow, 1, 1, newRow.length).setValues([newRow]);
    
    // Appliquer le formatage conditionnel
    const color = 
      status === "Non affectée" ? "#FFFF00" : // Jaune
      status === "Erronée" ? "#FF0000" : // Rouge
      status === "Doublon" ? "#FFA500" : // Orange
      null;
    
    if (color) {
      sheetCMDInit.getRange(lastRow, 1, 1, newRow.length).setBackground(color);
    }
    
    // Enregistrer la ligne traitée pour référence
    processedRows.push({
      rowIndex: lastRow,
      status: status
    });
  }
  
  // Journaliser le traitement
  Logger.log(`YooCan: ${processedRows.length} commandes traitées. ${processedRows.filter(r => r.status === "Doublon").length} doublons détectés.`);
  
  // Retourne la nouvelle dernière ligne traitée et le dernier ID généré
  return {
    newLastRow: newLastProcessedRow,
    newLastID: currentID.toString()
  };
}

/**
 * Traitement des commandes Shopify
 * 
 * @param {Sheet} sheetShopify - Feuille des commandes Shopify
 * @param {Sheet} sheetCMDInit - Feuille de destination CMDInit
 * @param {Array} shopifyHeader - En-têtes de la feuille Shopify
 * @param {Array} cmdInitHeader - En-têtes de la feuille CMDInit
 * @param {Number} lastProcessedRow - Dernière ligne traitée
 * @param {String} lastGeneratedID - Dernier ID généré
 * @return {Object} - Objet contenant la nouvelle dernière ligne traitée et le dernier ID généré
 */
function processShopifyOrders(sheetShopify, sheetCMDInit, shopifyHeader, cmdInitHeader, lastProcessedRow, lastGeneratedID) {
  // Obtention des indices des colonnes dans Shopify
  const columnIndices = {
    client: shopifyHeader.indexOf("Client"),
    phone: shopifyHeader.indexOf("Téléphone"),
    address: shopifyHeader.indexOf("Adresse"),
    city: shopifyHeader.indexOf("Ville"),
    region: shopifyHeader.indexOf("Région"),
    product: shopifyHeader.indexOf("Produit"),
    price: shopifyHeader.indexOf("Prix"),
    tarif: shopifyHeader.indexOf("Tarif"),
    restAPayer: shopifyHeader.indexOf("Reste à Payer"),
    confirmation: shopifyHeader.indexOf("Confirmation"),
    date: shopifyHeader.indexOf("Date"),
    source: shopifyHeader.indexOf("Source"),
    operateur: shopifyHeader.indexOf("Opérateur"),
    dateEnvoi: shopifyHeader.indexOf("Date Envoie"),
    etatLivraison: shopifyHeader.indexOf("Etat livraison"),
    observation: shopifyHeader.indexOf("Observation")
  };
  
  // Obtention des indices des colonnes dans CMDInit
  const cmdIndices = {
    cmdNum: cmdInitHeader.indexOf("N° Commande"),
    status: cmdInitHeader.indexOf("Statut"),
    operator: cmdInitHeader.indexOf("Opérateur"),
    clientName: cmdInitHeader.indexOf("Client"),
    phone: cmdInitHeader.indexOf("Téléphone"),
    address: cmdInitHeader.indexOf("Adresse"),
    city: cmdInitHeader.indexOf("Ville"),
    product: cmdInitHeader.indexOf("Produit"),
    quantity: cmdInitHeader.indexOf("Quantité"),
    price: cmdInitHeader.indexOf("Prix"),
    dateCreation: cmdInitHeader.indexOf("Date Création")
  };
  
  // Vérification des colonnes essentielles
  const requiredColumns = ["phone", "product"];
  const missingColumns = requiredColumns.filter(col => cmdIndices[col] === -1);
  
  if (missingColumns.length > 0) {
    Logger.log("ERREUR: Colonnes essentielles manquantes dans CMDInit: " + missingColumns.join(", "));
    return { 
      newLastRow: lastProcessedRow, 
      newLastID: lastGeneratedID 
    };
  }
  
  // Récupération des données Shopify
  const lastRowShopify = sheetShopify.getLastRow();
  if (lastRowShopify <= 1) {
    return { 
      newLastRow: lastProcessedRow, 
      newLastID: lastGeneratedID 
    }; // Pas de données à traiter
  }
  
  // Déterminer les lignes à traiter (nouvelles commandes après la dernière ligne traitée)
  const startRow = Math.max(2, lastProcessedRow + 1);
  if (startRow > lastRowShopify) {
    return { 
      newLastRow: lastProcessedRow, 
      newLastID: lastGeneratedID 
    }; // Pas de nouvelles commandes
  }
  
  const numRows = lastRowShopify - startRow + 1;
  const shopifyData = sheetShopify.getRange(startRow, 1, numRows, shopifyHeader.length).getValues();
  
  // Si aucune donnée à traiter
  if (shopifyData.length === 0) {
    return { 
      newLastRow: lastProcessedRow, 
      newLastID: lastGeneratedID 
    };
  }
  
  // Initialiser le dernier ID généré
  let currentID = parseInt(lastGeneratedID) || 0;
  let newLastProcessedRow = lastProcessedRow;
  
  // Traiter ligne par ligne pour une meilleure synchronisation des doublons
  let lastRow = sheetCMDInit.getLastRow();
  
  // Préparer un tableau pour stocker les nouvelles lignes ajoutées
  // et les informations de formatage correspondantes
  const processedRows = [];
  
  // Traitement des commandes à ajouter
  for (let i = 0; i < shopifyData.length; i++) {
    const order = shopifyData[i];
    const currentRowNumber = startRow + i;
    
    // Mise à jour de la dernière ligne traitée
    newLastProcessedRow = currentRowNumber;
    
    // Incrémenter l'ID et formater avec des zéros à gauche
    currentID++;
    const formattedID = currentID.toString().padStart(6, '0');
    const newId = "SHP-" + formattedID;
    
    // Préparation des données pour CMDInit
    const newRow = Array(cmdInitHeader.length).fill("");
    
    // Mapping des colonnes - ajustement selon les en-têtes exacts
    if (cmdIndices.cmdNum !== -1) {
      newRow[cmdIndices.cmdNum] = newId; // Identifiant unique au format SHP-000001
    }
    
    if (cmdIndices.status !== -1) {
      newRow[cmdIndices.status] = "Non affectée"; // État par défaut
    }
    
    // Opérateur (Opérateur de Shopify si disponible)
    if (cmdIndices.operator !== -1 && columnIndices.operateur !== -1 && columnIndices.operateur < order.length) {
      newRow[cmdIndices.operator] = order[columnIndices.operateur] || "";
    }
    
    // Client (Client de Shopify)
    if (cmdIndices.clientName !== -1 && columnIndices.client !== -1 && columnIndices.client < order.length) {
      newRow[cmdIndices.clientName] = order[columnIndices.client] || "";
    }
    
    // Téléphone (Téléphone de Shopify)
    let phoneValue = "";
    if (cmdIndices.phone !== -1 && columnIndices.phone !== -1 && columnIndices.phone < order.length) {
      phoneValue = order[columnIndices.phone] ? order[columnIndices.phone].toString() : "";
      newRow[cmdIndices.phone] = phoneValue;
    }
    
    // Adresse (Adresse de Shopify)
    if (cmdIndices.address !== -1 && columnIndices.address !== -1 && columnIndices.address < order.length) {
      newRow[cmdIndices.address] = order[columnIndices.address] || "";
    }
    
    // Ville (Ville de Shopify)
    if (cmdIndices.city !== -1 && columnIndices.city !== -1 && columnIndices.city < order.length) {
      newRow[cmdIndices.city] = order[columnIndices.city] || "";
    }
    
    // Produit (Produit de Shopify)
    let productValue = "";
    if (cmdIndices.product !== -1 && columnIndices.product !== -1 && columnIndices.product < order.length) {
      productValue = order[columnIndices.product] || "";
      newRow[cmdIndices.product] = productValue;
    }
    
    // Quantité (défaut à 1)
    if (cmdIndices.quantity !== -1) {
      newRow[cmdIndices.quantity] = 1;
    }
    
    // Prix (Prix de Shopify)
    if (cmdIndices.price !== -1 && columnIndices.price !== -1 && columnIndices.price < order.length) {
      newRow[cmdIndices.price] = order[columnIndices.price] || "";
    }
    
    // Date Création (Date de Shopify)
    if (cmdIndices.dateCreation !== -1 && columnIndices.date !== -1 && columnIndices.date < order.length) {
      newRow[cmdIndices.dateCreation] = order[columnIndices.date] || "";
    }
    
    // Vérification du numéro de téléphone
    let status = "Non affectée";
    if (!isValidPhoneNumber(phoneValue) && cmdIndices.status !== -1) {
      status = "Erronée";
      newRow[cmdIndices.status] = status;
    }
    
    // Vérification des doublons - maintenant fait de façon synchronisée
    if (checkForDuplicates(sheetCMDInit, phoneValue, productValue) && cmdIndices.status !== -1) {
      status = "Doublon";
      newRow[cmdIndices.status] = status;
    }
    
    // Ajouter la ligne à la feuille immédiatement
    lastRow++;
    sheetCMDInit.getRange(lastRow, 1, 1, newRow.length).setValues([newRow]);
    
    // Appliquer le formatage conditionnel
    const color = 
      status === "Non affectée" ? "#FFFF00" : // Jaune
      status === "Erronée" ? "#FF0000" : // Rouge
      status === "Doublon" ? "#FFA500" : // Orange
      null;
    
    if (color) {
      sheetCMDInit.getRange(lastRow, 1, 1, newRow.length).setBackground(color);
    }
    
    // Enregistrer la ligne traitée pour référence
    processedRows.push({
      rowIndex: lastRow,
      status: status
    });
  }
  
  // Journaliser le traitement
  Logger.log(`Shopify: ${processedRows.length} commandes traitées. ${processedRows.filter(r => r.status === "Doublon").length} doublons détectés.`);
  
  // Retourne la nouvelle dernière ligne traitée et le dernier ID généré
  return {
    newLastRow: newLastProcessedRow,
    newLastID: currentID.toString()
  };
}

/**
 * Vérifie si un numéro de téléphone est valide selon le format marocain
 * Accepte le format avec ou sans indicatif
 * 
 * @param {String} phone - Numéro de téléphone à vérifier
 * @return {Boolean} - true si le numéro est valide, false sinon
 */
function isValidPhoneNumber(phone) {
  if (!phone) {
    return false;
  }
  
  // Conversion en chaîne de caractères si ce n'est pas déjà le cas
  const phoneStr = phone.toString();
  
  // Nettoyage du numéro de téléphone (suppression des espaces et caractères spéciaux)
  const cleanPhone = phoneStr.replace(/[\s\-\(\)\+\.]/g, "");
  
  // Si après nettoyage le numéro est vide ou trop court, il est invalide
  if (!cleanPhone || cleanPhone.length < 9) {
    return false;
  }
  
  // Formats de numéros marocains avec différentes variantes
  
  // 1. Format national: commençant par 06 ou 07, suivi de 8 chiffres (total 10 chiffres)
  if (/^(06|07)\d{8}$/.test(cleanPhone)) {
    return true;
  }
  
  // 2. Format avec indicatif international +212 ou 00212
  if (/^(00212|\+212|212)(6|7)\d{8}$/.test(cleanPhone)) {
    return true;
  }
  
  // 3. Format avec espaces ou caractères spéciaux déjà nettoyés
  // Vérifier si c'est un numéro à 9 chiffres commençant par 6 ou 7 (format sans 0 initial)
  if (/^[67]\d{8}$/.test(cleanPhone)) {
    return true;
  }
  
  // 4. Format incomplet mais potentiellement valide (numeros courts)
  // Pour éviter de marquer comme erronés des numéros qui pourraient être valides
  // mais entrés sans indicatif ou incomplets
  if (cleanPhone.length >= 9 && /\d{9,}/.test(cleanPhone)) {
    const last9Digits = cleanPhone.slice(-9);
    if (/^[67]\d{8}$/.test(last9Digits)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Cache pour optimiser la vérification des doublons
 * @type {Object}
 */
const duplicateCheckCache = {
  lastDataFetch: null,
  cachedPhoneProducts: [],
  lastCmdInitRows: 0,
  // Nouvelles commandes en cours de traitement dans la session actuelle
  currentSessionEntries: []
};

/**
 * Vérifie s'il existe des doublons dans les 100 dernières lignes de CMDInit
 * et dans les commandes traitées dans la session actuelle
 * 
 * @param {Sheet} sheetCMDInit - Feuille CMDInit
 * @param {String} phone - Numéro de téléphone à vérifier
 * @param {String} product - Produit à vérifier
 * @return {Boolean} - true s'il y a un doublon, false sinon
 */
function checkForDuplicates(sheetCMDInit, phone, product) {
  // Si pas de téléphone ou produit, pas de doublon
  if (!phone || !product) return false;
  
  // Nettoyage du numéro de téléphone pour la comparaison
  const cleanPhone = phone.toString().replace(/[\s\-\(\)\+\.]/g, "");
  const lastDigitsPhone = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : cleanPhone;
  
  // 1. Vérifier d'abord dans les entrées de la session actuelle
  // pour détecter les doublons dans les commandes en cours de traitement
  for (const entry of duplicateCheckCache.currentSessionEntries) {
    if (entry.phone === lastDigitsPhone && entry.product === product) {
      return true; // Doublon trouvé dans la session actuelle
    }
  }
  
  // Ajouter cette entrée aux commandes en cours de traitement
  duplicateCheckCache.currentSessionEntries.push({
    phone: lastDigitsPhone,
    product: product
  });
  
  const lastRow = sheetCMDInit.getLastRow();
  if (lastRow <= 1) {
    return false; // Pas de données, donc pas de doublons
  }
  
  // Déterminer le nombre de lignes à vérifier (les 100 dernières)
  const numRows = Math.min(100, lastRow - 1);
  const startRow = lastRow - numRows + 1;
  
  // Vérifier si nous pouvons utiliser le cache de la feuille
  const nowTimestamp = new Date().getTime();
  const cacheExpired = !duplicateCheckCache.lastDataFetch || 
                        (nowTimestamp - duplicateCheckCache.lastDataFetch > 60000); // Cache de 1 minute
  const rowsChanged = duplicateCheckCache.lastCmdInitRows !== lastRow;
  
  if (cacheExpired || rowsChanged) {
    // Récupérer les en-têtes
    const headers = sheetCMDInit.getRange(1, 1, 1, sheetCMDInit.getLastColumn()).getValues()[0];
    const phoneIndex = headers.indexOf("Téléphone");
    const productIndex = headers.indexOf("Produit");
    
    if (phoneIndex === -1 || productIndex === -1) {
      return false; // Colonnes requises non trouvées
    }
    
    // Récupérer les données à vérifier
    const dataToCheck = sheetCMDInit.getRange(startRow, 1, numRows, sheetCMDInit.getLastColumn()).getValues();
    
    // Mise à jour du cache
    duplicateCheckCache.cachedPhoneProducts = [];
    
    for (let i = 0; i < dataToCheck.length; i++) {
      const rowPhone = dataToCheck[i][phoneIndex] ? dataToCheck[i][phoneIndex].toString().replace(/[\s\-\(\)\+\.]/g, "") : "";
      const rowProduct = dataToCheck[i][productIndex];
      
      if (rowPhone && rowProduct) {
        const lastDigitsRowPhone = rowPhone.length >= 9 ? rowPhone.slice(-9) : rowPhone;
        duplicateCheckCache.cachedPhoneProducts.push({
          phone: lastDigitsRowPhone,
          product: rowProduct
        });
      }
    }
    
    duplicateCheckCache.lastDataFetch = nowTimestamp;
    duplicateCheckCache.lastCmdInitRows = lastRow;
  }
  
  // Rechercher dans le cache des entrées existantes
  for (const entry of duplicateCheckCache.cachedPhoneProducts) {
    if (entry.phone === lastDigitsPhone && entry.product === product) {
      return true; // Doublon trouvé dans les données existantes
    }
  }
  
  return false; // Pas de doublon trouvé
}

/**
 * Réinitialise le cache de session pour une nouvelle exécution
 * Doit être appelé au début du traitement des commandes
 */
function resetDuplicateSessionCache() {
  duplicateCheckCache.currentSessionEntries = [];
}

/**
 * Crée un déclencheur pour exécuter la fonction toutes les minutes
 * Avec une robustesse accrue pour éviter la création de déclencheurs en double
 */
function createTrigger() {
  // Suppression des déclencheurs existants pour éviter les doublons
  deleteTriggers();
  
  try {
    // Création d'un nouveau déclencheur qui s'exécute toutes les minutes
    const trigger = ScriptApp.newTrigger("YoozakRescueCMDAutomation")
      .timeBased()
      .everyMinutes(1)
      .create();
    
    Logger.log("Déclencheur créé avec succès. ID: " + trigger.getUniqueId());
    
    // Option: Stocker l'ID du déclencheur dans les propriétés du script
    PropertiesService.getScriptProperties().setProperty("YOUZAK_TRIGGER_ID", trigger.getUniqueId());
    
    return trigger;
  } catch (error) {
    Logger.log("Erreur lors de la création du déclencheur: " + error.message);
    throw error;
  }
}

/**
 * Supprime tous les déclencheurs existants pour cette fonction
 * @return {Number} - Nombre de déclencheurs supprimés
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "YoozakRescueCMDAutomation") {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  
  Logger.log(count + " déclencheur(s) supprimé(s)");
  return count;
}

/**
 * Vérification et restauration du déclencheur si nécessaire
 * Utile pour s'assurer que l'automatisation continue de fonctionner
 */
function checkAndRestoreTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let hasYouzakTrigger = false;
  
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "YoozakRescueCMDAutomation") {
      hasYouzakTrigger = true;
      break;
    }
  }
  
  if (!hasYouzakTrigger) {
    Logger.log("Aucun déclencheur trouvé pour YoozakRescueCMDAutomation. Création d'un nouveau déclencheur.");
    createTrigger();
    return true;
  }
  
  return false;
}

/**
 * Fonction pour tester le script manuellement
 * Utile pour le débogage et la vérification des fonctionnalités
 */
function testYoozakRescue() {
  try {
    YoozakRescueCMDAutomation();
    return "Test exécuté avec succès. Vérifiez les journaux pour plus de détails.";
  } catch (error) {
    return "Erreur lors du test: " + error.message + "\n" + error.stack;
  }
}

/**
 * Fonction à exécuter après mise à jour du script
 * Vérifie et met à jour la structure des feuilles sans perdre de données
 */
function postUpdateSetup() {
  try {
    // Utiliser la même approche que dans la fonction principale
    let ss;
    try {
      // D'abord, essayer d'obtenir le classeur actif
      ss = SpreadsheetApp.getActive();
      Logger.log("Utilisation du classeur actif");
      
      // Si null, essayer l'autre méthode
      if (!ss) {
        // Utiliser la constante globale si elle existe, sinon la nôtre
        const spreadsheetId = typeof CMD_INT_SPREADSHEET_ID !== 'undefined' ? 
                             CMD_INT_SPREADSHEET_ID : YOOZAK_SPREADSHEET_ID;
        
        ss = SpreadsheetApp.openById(spreadsheetId);
        Logger.log("Utilisation du classeur par ID: " + spreadsheetId);
      }
      
      if (!ss) {
        throw new Error("Impossible d'accéder au fichier Google Sheet");
      }
    } catch (e) {
      Logger.log("Erreur lors de l'accès au fichier: " + e.toString());
      throw new Error("Impossible d'accéder au Google Sheet: " + e.toString());
    }
    
    Logger.log("Début de la configuration post-mise à jour...");
    
    // 1. Vérifier et mettre à jour la feuille CMDlog
    let sheetCMDLog = ss.getSheetByName("CMDlog");
    let updated = false;
    
    if (sheetCMDLog) {
      // Vérifier si la colonne Dernier_ID_genere existe
      const headers = sheetCMDLog.getRange(1, 1, 1, sheetCMDLog.getLastColumn()).getValues()[0];
      const lastIDIndex = headers.indexOf("Dernier_ID_genere");
      
      if (lastIDIndex === -1) {
        // Ajouter la colonne manquante
        const lastCol = sheetCMDLog.getLastColumn() + 1;
        sheetCMDLog.getRange(1, lastCol).setValue("Dernier_ID_genere");
        
        // Initialiser avec des valeurs par défaut
        const lastRow = sheetCMDLog.getLastRow();
        for (let i = 2; i <= lastRow; i++) {
          sheetCMDLog.getRange(i, lastCol).setValue("000000");
        }
        
        Logger.log("Colonne Dernier_ID_genere ajoutée à la feuille CMDlog");
        updated = true;
      }
    } else {
      // Créer la feuille si elle n'existe pas
      sheetCMDLog = initCMDLogSheet(ss);
      Logger.log("Feuille CMDlog créée");
      updated = true;
    }
    
    // 2. Vérifier le déclencheur
    if (checkAndRestoreTrigger()) {
      Logger.log("Déclencheur restauré");
      updated = true;
    }
    
    // 3. Nettoyer le cache pour forcer le rafraîchissement des données
    duplicateCheckCache.lastDataFetch = null;
    duplicateCheckCache.cachedPhoneProducts = [];
    duplicateCheckCache.lastCmdInitRows = 0;
    
    if (updated) {
      Logger.log("Configuration post-mise à jour terminée avec succès");
      return "Mise à jour effectuée. La structure a été mise à jour.";
    } else {
      Logger.log("Configuration post-mise à jour terminée. Aucune modification nécessaire.");
      return "Aucune mise à jour nécessaire. Tout est déjà configuré correctement.";
    }
    
  } catch (error) {
    Logger.log("ERREUR lors de la configuration post-mise à jour: " + error.message);
    return "Erreur lors de la mise à jour: " + error.message;
  }
}

/**
 * Fonction exécutée automatiquement lors de l'ouverture du script dans l'éditeur
 * Permet de mettre en place les déclencheurs et vérifications nécessaires
 */
function onOpen() {
  try {
    // Vérifier si les déclencheurs existent déjà
    checkAndRestoreTrigger();
    
    // Vérifier l'accès au fichier Google Sheet
    let ss;
    try {
      // D'abord, essayer d'obtenir le classeur actif
      ss = SpreadsheetApp.getActive();
      Logger.log("Utilisation du classeur actif");
      
      // Si null, essayer l'autre méthode
      if (!ss) {
        // Utiliser la constante globale si elle existe, sinon la nôtre
        const spreadsheetId = typeof CMD_INT_SPREADSHEET_ID !== 'undefined' ? 
                             CMD_INT_SPREADSHEET_ID : YOOZAK_SPREADSHEET_ID;
        
        ss = SpreadsheetApp.openById(spreadsheetId);
        Logger.log("Utilisation du classeur par ID: " + spreadsheetId);
      }
      
      if (!ss) {
        throw new Error("Impossible d'accéder au fichier Google Sheet");
      }
    } catch (e) {
      Logger.log("Erreur lors de l'accès au fichier: " + e.toString());
      console.error("ATTENTION: Impossible d'accéder au Google Sheet: " + e.toString());
      return;
    }
    
    // Vérifier l'existence des feuilles principales
    const sheetYooCan = ss.getSheetByName("CMD YooCan");
    const sheetShopify = ss.getSheetByName("CMD Shopify");
    const sheetCMDInit = ss.getSheetByName("CMDInit");
    
    if (!sheetYooCan || !sheetShopify || !sheetCMDInit) {
      console.error("ATTENTION: Une ou plusieurs feuilles importantes sont manquantes dans le fichier Google Sheet.");
    }
    
    console.info("Initialisation du script YoozakRescueCMD terminée avec succès.");
  } catch (error) {
    console.error("Erreur lors de l'initialisation: " + error.message);
  }
} 