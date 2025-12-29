import type { HelpContent, HelpRouteKey } from '../help-types';

export const HELP_CONTENT_FR: Partial<Record<HelpRouteKey, HelpContent>> = {
  '/dashboard/movimientos': {
    title: 'Aide · Mouvements',
    intro:
      'Ici, vous importez et révisez les mouvements bancaires pour que la fiscalité et les exports soient propres.',
    steps: [
      'Importez l\'extrait : cliquez sur « Importer l\'extrait » et chargez le CSV/XLSX de la banque.',
      'Vérifiez l\'aperçu avant d\'importer (dates, montants, libellés).',
      'Filtrez pour trouver les éléments en attente : « Sans catégorie », « Sans contact » et (si présent) « Retours en attente ».',
      'Ouvrez un mouvement et assignez Catégorie et Contact (donateur/fournisseur/salarié) si nécessaire.',
      'Ajoutez un justificatif (facture) quand il le faut : icône document ou glisser-déposer sur la ligne (si disponible).',
      'Si vous voyez une remise (un seul crédit avec plusieurs cotisations), utilisez le menu ⋮ pour « Scinder la remise ».',
      'Si vous voyez un versement Stripe, utilisez le menu ⋮ pour « Scinder la remise Stripe » et chargez le CSV Stripe (Paiements → exporter).',
      'À la fin, vérifiez que les mouvements clés ont Catégorie + Contact : cela réduit les erreurs sur les modèles fiscaux et certificats.',
    ],
    tips: [
      'Commencez par les filtres d\'attente (Sans catégorie / Sans contact) avant de traiter les cas isolés.',
      'Pour les retours, le mouvement d\'origine n\'est pas modifié : il faut assigner le donateur au retour pour que la déduction soit correcte.',
      'Si un contact a une « catégorie par défaut », l\'assignation peut compléter automatiquement la catégorie.',
    ],
    keywords: ['importer', 'extrait', 'catégorie', 'contact', 'remise', 'stripe', 'retours', 'document'],
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
};
