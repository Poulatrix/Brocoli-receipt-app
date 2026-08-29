/**
 * Smart Food Image Resolver (French & World Cuisine)
 * Provides context-specific, appetizing, high-resolution food images
 * based on meal titles, keywords, ingredients, and cooking styles.
 */

interface FoodCategory {
  id: string;
  name: string;
  // Keywords that strongly identify this dish (score = 10)
  exactKeywords: string[];
  // Secondary keywords/ingredients that support this dish (score = 4)
  secondaryKeywords?: string[];
  // Curated Unsplash food photography URLs for this exact meal
  images: string[];
}

export const FOOD_IMAGE_CATEGORIES: FoodCategory[] = [
  // -------------------------------------------------------------
  // 1. TARTIFLETTE, RACLETTE, FONDUE & PLATS MONTAGNARDS
  // -------------------------------------------------------------
  {
    id: 'tartiflette',
    name: 'Tartiflette & Croziflette',
    exactKeywords: ['tartiflette', 'croziflette', 'morbiflette', 'reblochonade', 'reblochon'],
    secondaryKeywords: ['lardons', 'pommes de terre reblochon'],
    images: [
      'https://images.unsplash.com/photo-1597393353415-b3730f3719fe?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1584947920409-7756e0d37e42?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'raclette_fondue',
    name: 'Raclette & Fondue',
    exactKeywords: ['raclette', 'fondue', 'fondue savoyarde', 'fondue bourguignonne', 'aligot', 'mont d or'],
    secondaryKeywords: ['charcuterie fromage', 'fromage fondu'],
    images: [
      'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1597393353415-b3730f3719fe?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 2. GRATINS & PARMENTIERS
  // -------------------------------------------------------------
  {
    id: 'gratin_dauphinois',
    name: 'Gratin dauphinois',
    exactKeywords: ['dauphinois', 'gratin dauphinois', 'gratin pomme de terre', 'pommes dauphinoises'],
    secondaryKeywords: ['gratin'],
    images: [
      'https://images.unsplash.com/photo-1597393353415-b3730f3719fe?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1584947920409-7756e0d37e42?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'hachis_parmentier',
    name: 'Hachis parmentier',
    exactKeywords: ['parmentier', 'hachis parmentier', 'shepherd pie', 'cottage pie'],
    secondaryKeywords: ['puree boeuf', 'puree hache'],
    images: [
      'https://images.unsplash.com/photo-1584947920409-7756e0d37e42?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'gratin_legumes',
    name: 'Gratin de légumes',
    exactKeywords: ['gratin de courgettes', 'gratin de chou fleur', 'gratin de brocolis', 'gratin de legumes', 'gratin d aubergines', 'tian'],
    secondaryKeywords: ['gratin courgette', 'gratin chou'],
    images: [
      'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 3. PLATS MIJOTÉS TRADITIONNELS FRANÇAIS
  // -------------------------------------------------------------
  {
    id: 'boeuf_bourguignon',
    name: 'Boeuf Bourguignon & Ragoûts',
    exactKeywords: ['bourguignon', 'boeuf bourguignon', 'daube', 'carbonnade', 'carbonnade flamande', 'goulash', 'ragout de boeuf', 'pot au feu'],
    secondaryKeywords: ['boeuf carottes', 'boeuf mijote', 'paleron'],
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'blanquette_veau',
    name: 'Blanquette de Veau',
    exactKeywords: ['blanquette', 'blanquette de veau', 'veau marengo', 'osso buco', 'paupiette', 'paupiettes'],
    secondaryKeywords: ['veau', 'escalope de veau', 'roti de veau', 'sauce blanche champignon'],
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'tomates_farcies',
    name: 'Légumes Farcis',
    exactKeywords: ['farcies', 'farcis', 'tomates farcies', 'courgettes farcies', 'poivrons farcis', 'aubergines farcies'],
    secondaryKeywords: ['chair a saucisse farcie', 'legume farci'],
    images: [
      'https://images.unsplash.com/photo-1592417817098-8f3d6eb2251a?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'ratatouille',
    name: 'Ratatouille & Poêlées du Sud',
    exactKeywords: ['ratatouille', 'tian de legumes', 'caponata', 'piperade'],
    secondaryKeywords: ['courgettes aubergines poivrons', 'poelee provencale'],
    images: [
      'https://images.unsplash.com/photo-1572441713132-c542fc4fe282?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'choucroute_cassoulet',
    name: 'Choucroute & Cassoulet',
    exactKeywords: ['choucroute', 'cassoulet', 'petit sale', 'lentilles saucisses', 'saucisses lentilles'],
    secondaryKeywords: ['chou saucisse', 'haricots saucisse'],
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'endives_jambon',
    name: 'Endives au jambon',
    exactKeywords: ['endives au jambon', 'chicons au gratin', 'chicon', 'endive'],
    secondaryKeywords: ['roule jambon bechamel'],
    images: [
      'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1597393353415-b3730f3719fe?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 4. POULET, DINDE & VOLAILLE
  // -------------------------------------------------------------
  {
    id: 'poulet_roti',
    name: 'Poulet rôti & Cuisses au four',
    exactKeywords: ['poulet roti', 'cuisse de poulet', 'poulet au four', 'ailes de poulet', 'roast chicken', 'poulet frites'],
    secondaryKeywords: ['poulet', 'chicken', 'volaille', 'cuisses'],
    images: [
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'poulet_cuisine',
    name: 'Poulet cuisiné (Basquaise, Crème, Moutarde)',
    exactKeywords: ['poulet basquaise', 'poulet a la creme', 'poulet moutarde', 'poulet champignons', 'escalope milanaise', 'cordon bleu', 'nuggets', 'escalope'],
    secondaryKeywords: ['filet de poulet', 'escalope de dinde', 'poulet sauce'],
    images: [
      'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'canard',
    name: 'Canard & Magret',
    exactKeywords: ['magret', 'canard', 'magret de canard', 'confit de canard', 'aiguillettes de canard', 'canard a l orange'],
    secondaryKeywords: ['duck', 'cuisse de canard'],
    images: [
      'https://images.unsplash.com/photo-1514944298352-7b0032e39958?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 5. VIANDES ROUGES, STEAKS & AGNEAU
  // -------------------------------------------------------------
  {
    id: 'steak_grillades',
    name: 'Steak, Entrecôte & Grillades',
    exactKeywords: ['steak', 'entrecote', 'bavette', 'faux filet', 'cote de boeuf', 'onglet', 'steak frites', 'viande hachee', 'rumsteak'],
    secondaryKeywords: ['beef', 'boeuf', 'grillade', 'echalote'],
    images: [
      'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'tartare_carpaccio',
    name: 'Tartare & Carpaccio',
    exactKeywords: ['tartare', 'tartare de boeuf', 'carpaccio', 'carpaccio de boeuf'],
    secondaryKeywords: ['viande crue', 'tartare'],
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'agneau',
    name: 'Agneau & Gigot',
    exactKeywords: ['agneau', 'gigot', 'gigot d agneau', 'souris d agneau', 'cotelettes d agneau', 'navarin'],
    secondaryKeywords: ['lamb', 'mouton'],
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1514944298352-7b0032e39958?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'porc_saucisses',
    name: 'Porc & Saucisses',
    exactKeywords: ['porc', 'roti de porc', 'cote de porc', 'filet mignon', 'saucisse', 'saucisses', 'chipolatas', 'merguez', 'rougail', 'ribs'],
    secondaryKeywords: ['pork', 'lardons', 'bacon', 'jambon'],
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 6. POISSONS & FRUITS DE MER
  // -------------------------------------------------------------
  {
    id: 'saumon',
    name: 'Saumon & Truite',
    exactKeywords: ['saumon', 'salmon', 'pave de saumon', 'saumon grille', 'saumon aneth', 'truite', 'truite amandine'],
    secondaryKeywords: ['saumon riz', 'saumon epinards'],
    images: [
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'poisson_blanc',
    name: 'Poissons blancs (Cabillaud, Dorade, Bar, Colin)',
    exactKeywords: ['cabillaud', 'dos de cabillaud', 'dorade', 'bar', 'merlu', 'colin', 'lieu', 'sole', 'morue', 'poisson blanc', 'poisson pane', 'fish and chips', 'aioli'],
    secondaryKeywords: ['poisson', 'fish', 'filet de poisson'],
    images: [
      'https://images.unsplash.com/photo-1535140728325-a4d3707eee61?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'thon',
    name: 'Thon',
    exactKeywords: ['thon', 'pave de thon', 'tataki de thon', 'thon rouge', 'thon mi cuit', 'thon grille'],
    secondaryKeywords: ['tuna'],
    images: [
      'https://images.unsplash.com/photo-1535140728325-a4d3707eee61?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1501595091296-3aa970afb3ff?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'crevettes_crustaces',
    name: 'Crevettes & Fruits de mer',
    exactKeywords: ['crevette', 'crevettes', 'gambas', 'scampi', 'saint jacques', 'calamar', 'calamars', 'encornets', 'poulpe', 'seiche'],
    secondaryKeywords: ['crustaces', 'fruits de mer', 'shrimp', 'prawns'],
    images: [
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'moules',
    name: 'Moules frites & Moules marinières',
    exactKeywords: ['moule', 'moules', 'moules frites', 'moules marinieres', 'moules a la creme'],
    secondaryKeywords: ['mussels', 'coquillages'],
    images: [
      'https://images.unsplash.com/photo-1535140728325-a4d3707eee61?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 7. PÂTES & LASAGNES
  // -------------------------------------------------------------
  {
    id: 'lasagnes',
    name: 'Lasagnes',
    exactKeywords: ['lasagne', 'lasagnes', 'lasagna', 'cannelloni'],
    secondaryKeywords: ['lasagne boeuf', 'lasagne saumon', 'lasagne legumes'],
    images: [
      'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'pates_bolognaise',
    name: 'Pâtes Bolognaise & Viande',
    exactKeywords: ['bolognaise', 'bolognese', 'spaghetti bolognaise', 'pates bolognaise'],
    secondaryKeywords: ['sauce tomate viande', 'hache tomate'],
    images: [
      'https://images.unsplash.com/photo-1621996346565-e3d5d628169e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'pates_carbonara',
    name: 'Pâtes Carbonara',
    exactKeywords: ['carbonara', 'spaghetti carbonara', 'tagliatelles carbonara', 'pates carbonara'],
    secondaryKeywords: ['lardons creme pates', 'guanciale'],
    images: [
      'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'pates_pesto',
    name: 'Pâtes au Pesto',
    exactKeywords: ['pesto', 'pates au pesto', 'spaghetti pesto', 'penne pesto', 'gnocchi pesto'],
    secondaryKeywords: ['basilic pignons'],
    images: [
      'https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1621996346565-e3d5d628169e?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'pates_generique',
    name: 'Pâtes, Raviolis & Gnocchis',
    exactKeywords: ['pate', 'pates', 'pasta', 'spaghetti', 'tagliatelle', 'penne', 'ravioli', 'raviolis', 'gnocchi', 'gnocchis', 'macaroni', 'tortellini', 'coquillettes', 'mac and cheese', 'arrabiata'],
    secondaryKeywords: ['noodles', 'nouilles italiennes'],
    images: [
      'https://images.unsplash.com/photo-1621996346565-e3d5d628169e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 8. PIZZAS, QUICHES & TARTES SALÉES
  // -------------------------------------------------------------
  {
    id: 'pizza',
    name: 'Pizza & Focaccia',
    exactKeywords: ['pizza', 'calzone', 'focaccia', 'margherita', 'regina', '4 fromages', 'quatre fromages', 'pinsa'],
    secondaryKeywords: ['pate a pizza', 'mozzarella basilic'],
    images: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'quiche_lorraine',
    name: 'Quiche Lorraine & Tartes Salées',
    exactKeywords: ['quiche', 'quiche lorraine', 'tarte salee', 'tarte aux poireaux', 'flammekueche', 'tarte flambee', 'tourte', 'tarte chevre', 'tarte tomate', 'tarte aux legumes'],
    secondaryKeywords: ['pate brisee garnie', 'quiche saumon'],
    images: [
      'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 9. BURGERS, SANDWICHES, CROQUES & STREET FOOD
  // -------------------------------------------------------------
  {
    id: 'burger',
    name: 'Burger & Frites',
    exactKeywords: ['burger', 'cheeseburger', 'hamburg', 'smash burger', 'bacon burger'],
    secondaryKeywords: ['pain burger frites'],
    images: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'croque_monsieur',
    name: 'Croque-Monsieur & Toast',
    exactKeywords: ['croque', 'croque monsieur', 'croque madame', 'sandwich', 'club sandwich', 'bagel', 'wrap', 'panini', 'avocado toast', 'toast'],
    secondaryKeywords: ['pain de mie grille', 'tartine'],
    images: [
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'kebab_falafel',
    name: 'Kebab, Gyros & Falafels',
    exactKeywords: ['kebab', 'gyros', 'shawarma', 'falafel', 'falafels', 'pita'],
    secondaryKeywords: ['pain pita viande'],
    images: [
      'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 10. RISOTTO, RIZ & PAELLA
  // -------------------------------------------------------------
  {
    id: 'risotto',
    name: 'Risotto',
    exactKeywords: ['risotto', 'risotto champignons', 'risotto parmesan', 'risotto saumon', 'risotto asperges'],
    secondaryKeywords: ['riz arborio', 'riz cremeux'],
    images: [
      'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'paella',
    name: 'Paëlla',
    exactKeywords: ['paella', 'paella valenciana', 'riz espagnol'],
    secondaryKeywords: ['riz safrane fruits de mer'],
    images: [
      'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'riz_cuisine',
    name: 'Riz sauté & Cantonnais',
    exactKeywords: ['riz cantonnais', 'riz saute', 'fried rice', 'riz basmati', 'riz thai', 'riz pilaf', 'riz'],
    secondaryKeywords: ['rice', 'bol de riz'],
    images: [
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 11. MONDE : ASIATIQUE, CURRY, TAJINE & COUSCOUS
  // -------------------------------------------------------------
  {
    id: 'sushi_japonais',
    name: 'Sushi & Japonais',
    exactKeywords: ['sushi', 'sushis', 'maki', 'makis', 'sashimi', 'chirashi', 'california rolls', 'japonais'],
    secondaryKeywords: ['saumon cru riz', 'wasabi'],
    images: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'ramen_nouilles',
    name: 'Ramen & Nouilles Asiatiques',
    exactKeywords: ['ramen', 'udon', 'soba', 'nouilles sautees', 'pad thai', 'bo bun', 'bobun', 'pho'],
    secondaryKeywords: ['soupe de nouilles', 'wok de nouilles'],
    images: [
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'wok_asiatique',
    name: 'Wok, Nems & Gyozas',
    exactKeywords: ['wok', 'nems', 'nem', 'gyoza', 'gyozas', 'raviolis vapeur', 'dim sum', 'porc au caramel', 'poulet aigre doux', 'boeuf aux oignons', 'asiatique'],
    secondaryKeywords: ['wok poulet', 'wok boeuf', 'rouleaux de printemps'],
    images: [
      'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'curry_indien',
    name: 'Curry & Saveurs Indiennes',
    exactKeywords: ['curry', 'tikka', 'tikka masala', 'butter chicken', 'masala', 'dahl', 'korma', 'colombo', 'curry coco'],
    secondaryKeywords: ['curry poulet', 'curry legumes', 'epices indiennes'],
    images: [
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'couscous_tajine',
    name: 'Couscous & Tajine',
    exactKeywords: ['couscous', 'tajine', 'tagine', 'kefta', 'merguez couscous', 'semoule agneau'],
    secondaryKeywords: ['oriental', 'semoule legumes'],
    images: [
      'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'mexicain_tacos',
    name: 'Tacos, Fajitas & Mexicain',
    exactKeywords: ['tacos', 'fajitas', 'burrito', 'burritos', 'quesadilla', 'quesadillas', 'chili', 'chili con carne', 'enchiladas', 'guacamole', 'mexicain'],
    secondaryKeywords: ['tortilla mexicaine', 'fajita poulet'],
    images: [
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1584208632869-05eb0f0b6e15?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 12. SALADES & POKE BOWLS
  // -------------------------------------------------------------
  {
    id: 'poke_bowl',
    name: 'Poke Bowl & Bowls Healthy',
    exactKeywords: ['poke', 'poke bowl', 'buddha bowl', 'bowl', 'bowl saumon'],
    secondaryKeywords: ['edamame avocat riz saumon', 'healthy bowl'],
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'salade_composee',
    name: 'Salades Composées (César, Niçoise, Chèvre)',
    exactKeywords: ['salade', 'cesar', 'salade cesar', 'salade nicoise', 'salade chevre chaud', 'salade grecque', 'taboule', 'crudites', 'salade de pates', 'salade de riz', 'caprese', 'tomates mozza'],
    secondaryKeywords: ['salad', 'vinaigrette', 'salade composee'],
    images: [
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 13. SOUPES & VELOUTÉS
  // -------------------------------------------------------------
  {
    id: 'soupes_veloutes',
    name: 'Soupes, Veloutés & Bouillons',
    exactKeywords: ['soupe', 'veloute', 'potage', 'bouillon', 'gaspacho', 'minestrone', 'potiron', 'potimarron', 'courge', 'soupe a l oignon', 'soupe poireaux'],
    secondaryKeywords: ['soup', 'soupe de legumes', 'chou'],
    images: [
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1588566565463-180a5b2090f2?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 14. OEUFS & BRUNCH
  // -------------------------------------------------------------
  {
    id: 'oeufs_omelette',
    name: 'Omelettes, Oeufs & Shakshuka',
    exactKeywords: ['omelette', 'oeuf', 'oeufs', 'oeufs brouilles', 'oeuf au plat', 'oeufs poches', 'oeufs benedicte', 'shakshuka', 'tortilla espagnole'],
    secondaryKeywords: ['brunch', 'oeufs fromage'],
    images: [
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1584208632869-05eb0f0b6e15?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 15. CRÊPES & GAUFRES
  // -------------------------------------------------------------
  {
    id: 'crepes_galettes',
    name: 'Crêpes & Galettes bretonnes',
    exactKeywords: ['crepe', 'crepes', 'galette', 'galettes', 'galette bretonne', 'galette complete', 'pancake', 'pancakes', 'gaufre', 'gaufres'],
    secondaryKeywords: ['crepe salee', 'crepe sucree'],
    images: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 16. DESSERTS, GÂTEAUX & DOUCEURS
  // -------------------------------------------------------------
  {
    id: 'chocolat_gateaux',
    name: 'Gâteaux au chocolat & Pâtisseries',
    exactKeywords: ['chocolat', 'chocolate', 'gateau', 'cake', 'fondant', 'brownie', 'cookies', 'cookie', 'mousse au chocolat', 'tarte aux pommes', 'tartelette', 'tiramisu', 'cheesecake', 'crumble', 'dessert'],
    secondaryKeywords: ['sucre', 'patisserie', 'muffin', 'creme brulee'],
    images: [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=900&q=80'
    ]
  },

  // -------------------------------------------------------------
  // 17. LÉGUMES & VÉGÉTARIEN
  // -------------------------------------------------------------
  {
    id: 'legumes_veggie',
    name: 'Plats Végétariens & Poêlées de Légumes',
    exactKeywords: ['veggie', 'vegetarien', 'poelee', 'legumes', 'legume', 'courgettes', 'aubergines', 'champignons', 'haricots', 'brocolis', 'tofu', 'poelee de legumes'],
    secondaryKeywords: ['legumes verts', 'bio', 'legumes rotis'],
    images: [
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1572441713132-c542fc4fe282?auto=format&fit=crop&w=900&q=80'
    ]
  }
];

// Rich, varied gourmet fallback gallery when no category score is triggered
const GENERAL_FOOD_GALLERY = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=900&q=80'
];

/**
 * Generates a deterministic positive integer hash from a string.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Normalizes text for matching (lowercase, strips accents and non-alphanumeric chars).
 */
export function normalizeDishText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gets a tailored, context-specific food image strictly in relation with the meal's title.
 * Uses a weighted scoring matcher across extensive culinary categories.
 * 
 * @param dishName The name of the meal (e.g. "Blanquette de veau", "Pâtes au pesto", "Tartiflette")
 * @param fallbackUrl Optional manual URL
 */
export function getDishImage(dishName?: string | null, fallbackUrl?: string): string {
  if (fallbackUrl && fallbackUrl.trim().startsWith('http')) {
    return fallbackUrl;
  }

  if (!dishName || !dishName.trim()) {
    return GENERAL_FOOD_GALLERY[0];
  }

  const normalized = normalizeDishText(dishName);
  if (!normalized) {
    return GENERAL_FOOD_GALLERY[0];
  }

  const words = normalized.split(/\s+/).filter(w => w.length >= 2);
  const hash = hashString(dishName);

  let bestCategory: FoodCategory | null = null;
  let highestScore = 0;

  for (const cat of FOOD_IMAGE_CATEGORIES) {
    let score = 0;

    // Check exact match keywords (Weight = 10)
    for (const kw of cat.exactKeywords) {
      const normKw = normalizeDishText(kw);
      if (normalized === normKw) {
        score += 25; // Exact full match
      } else if (normalized.includes(normKw)) {
        score += 12; // Phrase substring match
      } else {
        // Individual token matching
        const kwWords = normKw.split(/\s+/);
        const allWordsPresent = kwWords.every(w => words.some(userWord => userWord === w || userWord.startsWith(w) || w.startsWith(userWord)));
        if (allWordsPresent) {
          score += 10;
        } else {
          const anyWordPresent = kwWords.some(w => words.some(userWord => (userWord.length >= 4 && w.length >= 4 && (userWord.includes(w) || w.includes(userWord)))));
          if (anyWordPresent) {
            score += 5;
          }
        }
      }
    }

    // Check secondary support keywords (Weight = 4)
    if (cat.secondaryKeywords) {
      for (const kw of cat.secondaryKeywords) {
        const normKw = normalizeDishText(kw);
        if (normalized.includes(normKw)) {
          score += 4;
        } else {
          const kwWords = normKw.split(/\s+/);
          if (kwWords.some(w => words.includes(w))) {
            score += 2;
          }
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestCategory = cat;
    }
  }

  // If a strong or moderate match was found, pick an image from the specific category
  if (bestCategory && highestScore > 0 && bestCategory.images.length > 0) {
    const idx = hash % bestCategory.images.length;
    return bestCategory.images[idx];
  }

  // Fallback: Deterministic selection across general curated food photography
  const generalIdx = hash % GENERAL_FOOD_GALLERY.length;
  return GENERAL_FOOD_GALLERY[generalIdx];
}
