
📁 Architecture de fichiers Yoozak Rescue CMD (Frontend + Backend)

🧱 Fichiers principaux (communs)
Frontend
Fichier : bases.html
Navbar


Sidebar dynamique selon rôle (admin / opérateur)


Layout général avec système d’onglets


✅ Design 100% basé sur Bootstrap 5.x


Utilisation exclusive des composants natifs (navbar, cards, table, forms, dropdowns, modals, etc.)


Aucun CSS personnalisé externe autorisé


Backend
Fichier : Code.gs (coté serveur parceque c’est en majuscule)
Routage des pages (doGet, include)


Fonctions communes : getActiveUser(), getRole()



🔐 Connexion
Frontend
Fichier : connexions.html
Formulaire de connexion : Nom / Mot de passe


✅ Design Bootstrap : formulaire centré, champ input-group, bouton btn-primary


Backend
Fichier : Connexion.gs
Authentifie l’utilisateur via la feuille CMDutilisateurs


Détermine le rôle (admin ou opérateur)


Redirige vers le dashboard correspondant


google sheet :CMDusers (https://docs.google.com/spreadsheets/d/1nhEpjRtGOBnwXLY8CBtcsMg1Cbfu-pox3ylraFoCg4c/edit?gid=0#gid=0) qui contient la 
Feuille Google  : CMDutilisateurs avec des utilisateurs existants 
Colonnes :
Nom


Role


Password


Utilisateurs par défaut :
Jesse → admin → password123


Emmanuel → opérateur → password123


Paul → opérateur → password123



🧑‍💼 Dashboard – Admin (avec onglets Bootstrap)
Frontend
Fichier : dashboard.html
Layout général Bootstrap avec <nav class="nav nav-tabs">


Vue admin avec 4 onglets :


Onglets et fichiers associés :
homes.html — Accueil administrateur (alertes, stats, résumé visuel)


cmdinits.html — Tableau interactif des commandes


✅ Table responsive table table-hover table-bordered


✅ Édition via select dropdowns Bootstrap (Statut, Opérateur)


operateurs.html — Liste + affectation commandes


✅ Listes en accordion / cards


cmdinitsettings.html — Paramètres avancés (modals Bootstrap, switch)


Backend
Dashboard.gs : Logique générale du dashboard


CMDinit.gs : Charger/modifier la feuille CMDInit (Statut, Opérateur)


Operateurs.gs : Charger les opérateurs et gérer les affectations



👨‍🔧 Dashboard – Opérateur (onglets Bootstrap)
Frontend
Inclus dans dashboard.html si rôle = opérateur :
homes.html — Accueil opérateur


cmdoperateurs.html — Tableau des commandes affectées


✅ Lecture seule ou modification partielle (Statut uniquement)


cmdconfirms.html — Confirmation des traitements (modals, badges Bootstrap)


cmdoperasettings.html — Réglages opérateur (formulaire)


Backend
CMDoperateur.gs : Charger les commandes affectées, mise à jour des statuts


CMDoperaSettings.gs : Gestion des paramètres de l’opérateur



📄 Feuilles Google Sheets utilisées
CMDInit
Feuille principale des commandes


Colonnes :


N° Commande, Statut, Opérateur, Client, Téléphone, Adresse, Ville, Produit, Quantité, Prix, Date Création


CMDlog
Journal d’action des utilisateurs


Opérateurs
Données sur les opérateurs disponibles


CMDutilisateurs
Liste d’utilisateurs pour la connexion avec rôles



✅ Design : Utilisation stricte de Bootstrap
Aucun CSS personnalisé


Composants Bootstrap uniquement :


Boutons, tableaux, formulaires, alertes, modals, tabs, dropdowns...


Structure et responsivité assurées par :


Grilles (.row, .col-*)


Composants (.card, .accordion, .form-control, .table, etc.)


Utilitaires (.text-center, .mb-3, .bg-light, etc.)



Tu peux copier tout ce contenu dans un document Word et utiliser les titres hiérarchiques pour une navigation fluide (Titre 1, Titre 2, Titre 3). Souhaites-tu aussi une version prête à imprimer ou une maquette ?


