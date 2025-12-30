import type { HelpContent, HelpRouteKey } from '../help-types';

export const HELP_CONTENT_FR: Partial<Record<HelpRouteKey, HelpContent>> = {
  '/dashboard/movimientos': {
    title: 'Aide · Mouvements',
    intro:
      'Cet écran est le centre de contrôle du quotidien : vous y vérifiez les entrées/sorties bancaires, repérez les éléments en attente et évitez que les erreurs ne s\'amplifient.',
    steps: [
      'Commencez par les éléments en attente : filtrez "Sans contact", "Sans catégorie" et "Retours en attente" si disponibles.',
      'Assignez d\'abord le contact (donateur, fournisseur ou salarié) : cela donne du contexte au mouvement.',
      'Assignez ensuite la catégorie lorsque le contact est clair.',
      'Vérifiez les encaissements groupés (remises) : scindez-les avant de continuer si nécessaire.',
      'Ajoutez des justificatifs seulement quand ils apportent de la valeur (factures, preuves pertinentes).',
    ],
    tips: [
      'Ordre recommandé : contact → catégorie → document. Changer l\'ordre crée souvent des doutes ensuite.',
      'Si un mouvement vous pose question, laissez-le en attente et continuez avec le reste.',
      'Une revue régulière des éléments en attente évite les accumulations difficiles à traiter.',
    ],
    extra: {
      order: {
        title: 'Ordre de travail recommandé',
        items: [
          'Filtrer les éléments en attente (ce qui n\'est pas résolu).',
          'Assigner les contacts.',
          'Assigner les catégories.',
          'Vérifier remises et retours.',
          'Ajouter des documents quand cela apporte de la valeur.',
        ],
      },
      pitfalls: {
        title: 'Erreurs fréquentes',
        items: [
          'Assigner une catégorie sans avoir défini le contact.',
          'Forcer une affectation juste pour "tout nettoyer".',
          'Scinder les remises trop tard, après avoir déjà modifié d\'autres champs.',
          'Générer des rapports sans avoir vérifié les retours.',
        ],
      },
      whenNot: {
        title: 'Quand il n\'est pas nécessaire d\'agir',
        items: [
          'Inutile d\'assigner un projet si vous ne faites que le suivi du quotidien.',
          'Inutile d\'ajouter un document pour de petits mouvements évidents.',
          'Inutile de tout résoudre immédiatement : laisser des éléments en attente avec critère, c\'est aussi du contrôle.',
        ],
      },
      manual: {
        label: 'Manuel utilisateur · Gestion des mouvements',
        href: '/dashboard/manual#5-gestio-de-moviments',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Garder les mouvements sous contrôle en 10 minutes',
      },
    },
    keywords: [
      'contrôle',
      'en attente',
      'contact',
      'catégorie',
      'remise',
      'retours',
      'document',
      'quotidien',
    ],
  },

  '/dashboard/donants': {
    title: 'Aide · Donateurs',
    intro:
      'Ici, vous gérez les donateurs/adhérents et préparez les données pour que le Modèle 182 et les certificats soient corrects.',
    steps: [
      'Créez un donateur avec « + Nouveau donateur », ou importez une liste via « Importer des donateurs » (Excel/CSV).',
      'Vérifiez les champs fiscaux minimum : DNI/CIF et Code postal (indispensables pour le Modèle 182).',
      'Si le donateur existe déjà lors d\'un import, activez « Mettre à jour les donateurs existants » pour actualiser CP, IBAN, email, statut, etc.',
      'Gardez le statut « Actif/Inactif » à jour (et réactivez si besoin).',
      'Définissez une « Catégorie par défaut » si utile : lors de l\'assignation à un mouvement, la catégorie peut être préremplie.',
      'Ouvrez la fiche pour voir l\'historique et le résumé annuel des dons.',
      'Générez un certificat annuel depuis la fiche lorsque demandé (sélectionnez l\'année).',
      'Avant de générer le Modèle 182 ou des certificats en lot, corrigez les donateurs avec données incomplètes (DNI/CP).',
    ],
    tips: [
      'S\'il y a des retours, vérifiez qu\'ils sont assignés au bon donateur : ils impactent le total net et le Modèle 182.',
      'Pour de gros volumes, mieux vaut importer et corriger les doublons que de tout créer manuellement.',
      'En cas de doute, la fiche (résumé annuel + mouvements) est l\'endroit le plus rapide pour vérifier.',
    ],
    keywords: ['importer', 'dni', 'code postal', 'modèle 182', 'certificat', 'inactif', 'catégorie par défaut', 'historique'],
  },

  '/dashboard/proveidors': {
    title: 'Aide · Fournisseurs',
    intro:
      'Ici, vous gérez les fournisseurs de l\'organisation afin d\'affecter correctement les dépenses et de préparer le Modèle 347.',
    steps: [
      'Créez un fournisseur lorsque vous avez des dépenses récurrentes ou significatives avec une entreprise ou un professionnel.',
      'Renseignez le nom et le CIF : indispensable pour générer correctement le Modèle 347.',
      'Définissez une catégorie par défaut si le fournisseur facture toujours le même type de dépense.',
      'Complétez les coordonnées si utile (email, téléphone), même si ce n\'est pas obligatoire.',
      'Lors de l\'affectation à un mouvement, la catégorie par défaut peut s\'appliquer automatiquement.',
      'Utilisez le statut actif/inactif pour garder la liste propre sans perdre l\'historique.',
      'Avant de générer le Modèle 347, vérifiez les CIF et la cohérence des montants.',
    ],
    tips: [
      'Inutile de créer un fournisseur pour de petites dépenses ponctuelles : priorisez les récurrentes.',
      'Si le nom commercial change mais pas le CIF, mettez à jour le fournisseur existant.',
      'Un bon suivi des fournisseurs simplifie fortement le Modèle 347.',
    ],
    keywords: ['fournisseur', 'cif', 'modèle 347', 'catégorie par défaut', 'dépense', 'entreprise', 'professionnel'],
  },

  '/dashboard/treballadors': {
    title: 'Aide · Salariés',
    intro:
      'Ici, vous gérez les salariés de l\'organisation pour affecter les salaires et autres dépenses de personnel.',
    steps: [
      'Créez un salarié lorsque vous avez des salaires ou paiements récurrents.',
      'Renseignez le nom et le DNI pour faciliter le suivi interne.',
      'Définissez une catégorie par défaut (souvent salaires) pour accélérer l\'affectation.',
      'Maintenez le statut actif/inactif à jour lors des entrées et sorties.',
      'Lors de l\'affectation à un mouvement, vérifiez la cohérence de la catégorie.',
      'Utilisez cet écran comme référence interne ; il ne remplace pas un outil RH.',
    ],
    tips: [
      'Si un salarié n\'a plus de nouveaux mouvements, marquez-le inactif plutôt que de le supprimer.',
      'Centraliser les salaires par salarié rend la dépense de personnel plus lisible.',
      'Ne mélangez pas salariés et fournisseurs : chaque type a un rôle distinct.',
    ],
    keywords: ['salarié', 'salaire', 'personnel', 'dni', 'catégorie par défaut', 'dépense'],
  },

  '/dashboard/informes': {
    title: 'Aide · Rapports',
    intro:
      'Ici, vous générez les exports pour le cabinet : Modèle 182, Modèle 347 et certificats de don.',
    steps: [
      'Choisissez la section : Modèle 182 (dons), Modèle 347 (tiers) ou Certificats.',
      'Sélectionnez l\'année fiscale avant de générer un fichier.',
      'Modèle 182 : vérifiez les alertes de donateurs avec données manquantes (DNI/CIF et Code postal).',
      'Corrigez depuis Donateurs puis revenez ici pour régénérer.',
      'Générez l\'Excel du Modèle 182 et envoyez-le au cabinet.',
      'Modèle 347 : vérifiez que les fournisseurs ont un CIF correct ; seuls ceux au-dessus du seuil annuel apparaissent.',
      'Générez le CSV du Modèle 347 et envoyez-le au cabinet.',
      'Certificats : générez un certificat individuel à la demande ou en lot pour la campagne annuelle.',
      'Les retours assignés sont automatiquement déduits du total net (important pour 182 et certificats).',
    ],
    tips: [
      'Avant de clôturer l\'année, assurez-vous que les retours sont assignés au bon donateur : c\'est une cause fréquente d\'incohérences.',
      'Un donateur sans DNI ou Code postal peut bloquer ou dégrader le Modèle 182 : priorisez ces champs.',
      'Pour un envoi massif, vérifiez d\'abord 2–3 donateurs représentatifs (avec et sans retours).',
    ],
    keywords: ['modèle 182', 'modèle 347', 'certificats', 'excel', 'csv', 'année', 'dons', 'retours', 'cabinet'],
  },

  '/dashboard/configuracion': {
    title: 'Aide · Paramètres',
    intro:
      'Ici, vous configurez les données de base de l\'organisation pour que certificats et rapports fiscaux soient corrects.',
    steps: [
      'Renseignez les données fiscales (nom, CIF, adresse, contact) : elles apparaissent sur les certificats et documents.',
      'Ajoutez le logo : il est utilisé sur les certificats et améliore la cohérence visuelle.',
      'Configurez la signature (image) et le nom/fonction du signataire : sans cela, les certificats peuvent être incomplets.',
      'Vérifiez les catégories : assurez-vous d\'avoir des catégories cohérentes (dons, cotisations, salaires, frais bancaires…).',
      'Gérez les membres : invitez et attribuez des rôles selon les besoins (édition vs lecture).',
      'Ajustez les préférences si disponibles (seuils d\'alertes) pour éviter le bruit.',
      'En cas de doute fiscal, revenez ici et vérifiez d\'abord : données de l\'organisation + signature + catégories.',
    ],
    tips: [
      'Priorité : données fiscales + signature. Impact direct sur certificats et Modèle 182.',
      'Pour une personne en consultation, utilisez un rôle lecture pour éviter les modifications accidentelles.',
      'Après des mois d\'usage, modifiez les catégories avec prudence : souvent, ajouter est préférable à renommer agressivement.',
    ],
    keywords: ['organisation', 'cif', 'adresse', 'logo', 'signature', 'signataire', 'catégories', 'membres', 'rôles', 'préférences'],
  },

  '/dashboard/project-module/expenses': {
    title: 'Aide · Affectation des dépenses (Projets)',
    intro:
      'Cette boîte de réception regroupe les dépenses affectables : vous décidez ici à quel projet et à quelle ligne budgétaire rattacher chaque dépense, de façon rapide et réversible.',
    steps: [
      'Comprendre l\'écran : chaque ligne est une dépense (banque ou terrain) avec un statut 0% / partiel / 100%.',
      'Commencez par les en attente : filtrez "Non affectées" (0%) pour prioriser ce qui n\'est pas encore imputé.',
      'Quick Assign 100% : utilisez l\'action rapide pour affecter 100% de la dépense à un projet et (si besoin) à une ligne budgétaire.',
      'Split (affectation multiple) : si une dépense doit être répartie entre projets ou lignes, utilisez l\'affectation multiple et répartissez les montants jusqu\'à équilibre.',
      'Vérifiez le statut : le pourcentage doit refléter la réalité (100% si totalement imputée ; partiel si seulement une partie).',
      'Désaffecter : en cas d\'erreur, annulez l\'affectation pour revenir à 0% (ou ajustez la répartition).',
      'Affectation en masse : sélectionnez plusieurs dépenses et appliquez une affectation en bloc pour les cas répétitifs (même projet/ligne).',
      'Fin de revue : avant de valider un projet, vérifiez que les dépenses clés sont à 100% et que les splits ne laissent pas de montants "orphelins".',
    ],
    tips: [
      'Quand une ligne est sur-exécutée, le split partiel est la manière réaliste de rééquilibrer sans inventer des dépenses.',
      'Si une dépense ne correspond à aucun projet, mieux vaut la laisser à 0% que forcer une affectation incorrecte.',
      'Les dépenses terrain sont souvent saisies d\'abord puis affectées ensuite : privilégiez la cohérence de l\'imputation plutôt que la vitesse.',
    ],
    keywords: [
      'affectation',
      'projet',
      'ligne budgétaire',
      'quick assign',
      'split',
      '100%',
      'partiel',
      'désaffecter',
      'en masse',
      'terrain',
    ],
  },

  '/dashboard/project-module/projects': {
    title: 'Aide · Gestion des projets',
    intro:
      'Ici, vous créez et gérez les projets du module Projets, que vous utiliserez ensuite pour y affecter des dépenses.',
    steps: [
      'Créez un projet lorsque vous devez regrouper des dépenses sous un même ensemble (ex. une subvention, un programme ou une période de travail).',
      'Choisissez un nom clair et identifiable : c\'est celui affiché dans la boîte d\'affectation des dépenses.',
      'Ajoutez un code ou une référence si vous travaillez avec des justificatifs externes (optionnel mais recommandé).',
      'Vérifiez le statut du projet : actif tant que des dépenses y sont affectées ; fermé lorsqu\'il ne doit plus être utilisé.',
      'Si le projet a un budget, saisissez-le ou gérez les lignes budgétaires depuis son écran économique.',
      'Le projet prend son sens lorsque vous y affectez des dépenses depuis « Affectation des dépenses ».',
      'Évitez les projets en double pour de petites variantes : mieux vaut peu de projets bien définis.',
      'Quand le projet est terminé, fermez-le pour garder de l\'ordre et éviter des affectations accidentelles.',
    ],
    tips: [
      'Si vous hésitez pour une dépense, laissez-la non affectée jusqu\'à décision.',
      'Un projet bien défini rend l\'affectation plus rapide et réduit les erreurs.',
      'Fermer les anciens projets réduit le bruit et évite les mauvais choix.',
    ],
    keywords: ['projet', 'créer', 'éditer', 'fermer', 'code', 'budget', 'lignes budgétaires', 'affectation'],
  },
};
