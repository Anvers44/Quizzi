export interface Question {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  timeLimit: number;
  theme: string;
}

export const THEME_LABELS: Record<string, string> = {
  general: "🌍 Culture générale",
  sport: "⚽ Sport",
  cinema: "🎬 Cinéma",
  music: "🎵 Musique",
  history: "📜 Histoire",
  geography: "🗺️ Géographie",
  science: "🔬 Science",
  games: "🎮 Jeux vidéo",
  logos: "🏷️ Logos & Marques",
  flags: "🏳️ Drapeaux",
  all: "🎲 Tous les thèmes",
};

const RAW: Omit<Question, "id">[] = [
  // ── CULTURE GÉNÉRALE ──────────────────────────────────────────
  {
    theme: "general",
    timeLimit: 20,
    text: "Quelle est la capitale de l'Australie ?",
    choices: ["Sydney", "Canberra", "Melbourne", "Brisbane"],
    correctIndex: 1,
  },
  {
    theme: "general",
    timeLimit: 20,
    text: "Qui a peint la Joconde ?",
    choices: ["Michel-Ange", "Raphaël", "Léonard de Vinci", "Botticelli"],
    correctIndex: 2,
  },
  {
    theme: "general",
    timeLimit: 15,
    text: "Combien y a-t-il d'os dans le corps humain adulte ?",
    choices: ["186", "206", "226", "246"],
    correctIndex: 1,
  },
  {
    theme: "general",
    timeLimit: 15,
    text: "Quelle est la monnaie du Japon ?",
    choices: ["Yuan", "Won", "Yen", "Baht"],
    correctIndex: 2,
  },
  {
    theme: "general",
    timeLimit: 20,
    text: "Quel est le pays le plus grand au monde (superficie) ?",
    choices: ["Canada", "USA", "Chine", "Russie"],
    correctIndex: 3,
  },
  {
    theme: "general",
    timeLimit: 15,
    text: "Combien de planètes composent notre système solaire ?",
    choices: ["7", "8", "9", "10"],
    correctIndex: 1,
  },
  {
    theme: "general",
    timeLimit: 20,
    text: "Quelle est la langue la plus parlée au monde ?",
    choices: ["Anglais", "Espagnol", "Hindi", "Mandarin"],
    correctIndex: 3,
  },
  {
    theme: "general",
    timeLimit: 20,
    text: "Qui a écrit 'Les Misérables' ?",
    choices: ["Balzac", "Zola", "Victor Hugo", "Flaubert"],
    correctIndex: 2,
  },
  {
    theme: "general",
    timeLimit: 15,
    text: "En quelle année a été construite la Tour Eiffel ?",
    choices: ["1879", "1889", "1899", "1909"],
    correctIndex: 1,
  },
  {
    theme: "general",
    timeLimit: 15,
    text: "Combien de couleurs compte l'arc-en-ciel ?",
    choices: ["5", "6", "7", "8"],
    correctIndex: 2,
  },
  {
    theme: "general",
    timeLimit: 20,
    text: "Quel est le plus grand océan du monde ?",
    choices: ["Atlantique", "Arctique", "Indien", "Pacifique"],
    correctIndex: 3,
  },
  {
    theme: "general",
    timeLimit: 20,
    text: "Quelle planète est la plus grande du système solaire ?",
    choices: ["Saturne", "Neptune", "Jupiter", "Uranus"],
    correctIndex: 2,
  },

  // ── SPORT ─────────────────────────────────────────────────────
  {
    theme: "sport",
    timeLimit: 20,
    text: "Dans quel pays se sont déroulés les JO d'été 2024 ?",
    choices: ["Japon", "USA", "France", "Australie"],
    correctIndex: 2,
  },
  {
    theme: "sport",
    timeLimit: 15,
    text: "Combien de joueurs compte une équipe de basketball sur le terrain ?",
    choices: ["4", "5", "6", "7"],
    correctIndex: 1,
  },
  {
    theme: "sport",
    timeLimit: 20,
    text: "Quel joueur a remporté le plus de Ballons d'Or ?",
    choices: ["Ronaldo", "Messi", "Zidane", "Ronaldinho"],
    correctIndex: 1,
  },
  {
    theme: "sport",
    timeLimit: 20,
    text: "Quel pays a remporté le plus de Coupes du Monde de football ?",
    choices: ["Argentine", "Brésil", "Allemagne", "France"],
    correctIndex: 1,
  },
  {
    theme: "sport",
    timeLimit: 15,
    text: "Combien de kilomètres mesure un marathon ?",
    choices: ["40", "42,195", "45", "50"],
    correctIndex: 1,
  },
  {
    theme: "sport",
    timeLimit: 15,
    text: "Combien de points vaut un essai au rugby ?",
    choices: ["3", "4", "5", "6"],
    correctIndex: 2,
  },
  {
    theme: "sport",
    timeLimit: 20,
    text: "Dans quel sport pratique-t-on le 'smash' et le 'service' avec un volant ?",
    choices: ["Tennis", "Badminton", "Squash", "Ping-pong"],
    correctIndex: 1,
  },
  {
    theme: "sport",
    timeLimit: 20,
    text: "Combien de sets faut-il gagner pour remporter Wimbledon (hommes) ?",
    choices: ["2", "3", "4", "5"],
    correctIndex: 1,
  },
  {
    theme: "sport",
    timeLimit: 20,
    text: "Quel sport Rafael Nadal pratique-t-il ?",
    choices: ["Golf", "Tennis", "Football", "Natation"],
    correctIndex: 1,
  },
  {
    theme: "sport",
    timeLimit: 20,
    text: "Combien de joueurs y a-t-il dans une équipe de football ?",
    choices: ["9", "10", "11", "12"],
    correctIndex: 2,
  },
  {
    theme: "sport",
    timeLimit: 15,
    text: "Quelle nation a remporté la Coupe du Monde 2018 ?",
    choices: ["Brésil", "Allemagne", "France", "Croatie"],
    correctIndex: 2,
  },
  {
    theme: "sport",
    timeLimit: 20,
    text: "Dans quel sport utilise-t-on un filet, des raquettes et une balle jaune ?",
    choices: ["Badminton", "Squash", "Tennis", "Ping-pong"],
    correctIndex: 2,
  },

  // ── CINÉMA ────────────────────────────────────────────────────
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Qui réalise la saga 'Star Wars' originale ?",
    choices: [
      "Steven Spielberg",
      "George Lucas",
      "James Cameron",
      "Ridley Scott",
    ],
    correctIndex: 1,
  },
  {
    theme: "cinema",
    timeLimit: 15,
    text: "Quel acteur joue Tony Stark dans les films Marvel ?",
    choices: [
      "Chris Evans",
      "Robert Downey Jr.",
      "Chris Hemsworth",
      "Mark Ruffalo",
    ],
    correctIndex: 1,
  },
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Dans quel film voit-on la fameuse scène de la douche au Bates Motel ?",
    choices: ["L'Exorciste", "Psychose", "Halloween", "Shining"],
    correctIndex: 1,
  },
  {
    theme: "cinema",
    timeLimit: 15,
    text: "Qui a réalisé 'Titanic' (1997) ?",
    choices: [
      "Steven Spielberg",
      "James Cameron",
      "Peter Jackson",
      "Christopher Nolan",
    ],
    correctIndex: 1,
  },
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Quel acteur joue Forrest dans 'Forrest Gump' ?",
    choices: ["Tom Cruise", "Tom Hanks", "Brad Pitt", "Matt Damon"],
    correctIndex: 1,
  },
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Dans quel pays se déroule 'Parasite' (Palme d'Or 2019) ?",
    choices: ["Japon", "Chine", "Corée du Sud", "Thaïlande"],
    correctIndex: 2,
  },
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Quel film Disney met en scène une petite sirène ?",
    choices: ["Cendrillon", "Blanche-Neige", "La Petite Sirène", "Aladdin"],
    correctIndex: 2,
  },
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Quel personnage dit 'Je suis ton père' dans Star Wars ?",
    choices: ["L'Empereur", "Dark Vador", "Obi-Wan", "Yoda"],
    correctIndex: 1,
  },
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Quel film met en scène le personnage de Jack Sparrow ?",
    choices: [
      "Pirates des Caraïbes",
      "Gladiator",
      "Troy",
      "Master and Commander",
    ],
    correctIndex: 0,
  },
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Qui joue Hermione Granger dans Harry Potter ?",
    choices: [
      "Keira Knightley",
      "Emma Watson",
      "Helena Bonham Carter",
      "Bonnie Wright",
    ],
    correctIndex: 1,
  },
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Quel studio a créé les films Toy Story ?",
    choices: ["DreamWorks", "Universal", "Pixar", "Warner Bros"],
    correctIndex: 2,
  },
  {
    theme: "cinema",
    timeLimit: 20,
    text: "Dans quel film trouve-t-on la réplique 'Frankly, my dear, I don't give a damn' ?",
    choices: [
      "Casablanca",
      "Autant en emporte le vent",
      "La Garçonnière",
      "Rebecca",
    ],
    correctIndex: 1,
  },

  // ── MUSIQUE ───────────────────────────────────────────────────
  {
    theme: "music",
    timeLimit: 20,
    text: "Qui a sorti l'album 'Thriller' ?",
    choices: ["Prince", "Michael Jackson", "Whitney Houston", "Stevie Wonder"],
    correctIndex: 1,
  },
  {
    theme: "music",
    timeLimit: 15,
    text: "Quel groupe britannique est connu pour 'Bohemian Rhapsody' ?",
    choices: ["The Beatles", "Queen", "Rolling Stones", "Led Zeppelin"],
    correctIndex: 1,
  },
  {
    theme: "music",
    timeLimit: 20,
    text: "Quelle chanteuse est surnommée 'La Môme' ?",
    choices: ["Juliette Gréco", "Édith Piaf", "Barbara", "Dalida"],
    correctIndex: 1,
  },
  {
    theme: "music",
    timeLimit: 15,
    text: "Dans quel pays est né Bob Marley ?",
    choices: ["Trinité-et-Tobago", "Jamaïque", "Bahamas", "Cuba"],
    correctIndex: 1,
  },
  {
    theme: "music",
    timeLimit: 15,
    text: "Quel groupe a chanté 'Smells Like Teen Spirit' ?",
    choices: ["Pearl Jam", "Nirvana", "Soundgarden", "Alice in Chains"],
    correctIndex: 1,
  },
  {
    theme: "music",
    timeLimit: 20,
    text: "Quel artiste a sorti 'Shape of You' en 2017 ?",
    choices: ["Justin Bieber", "Ed Sheeran", "Bruno Mars", "Charlie Puth"],
    correctIndex: 1,
  },
  {
    theme: "music",
    timeLimit: 20,
    text: "Quel instrument joue Carlos Santana ?",
    choices: ["Basse", "Batterie", "Guitare", "Clavier"],
    correctIndex: 2,
  },
  {
    theme: "music",
    timeLimit: 20,
    text: "Qui est l'auteur de l'opéra 'La Traviata' ?",
    choices: ["Mozart", "Verdi", "Puccini", "Rossini"],
    correctIndex: 1,
  },
  {
    theme: "music",
    timeLimit: 20,
    text: "Combien de membres compte le groupe BTS ?",
    choices: ["5", "6", "7", "8"],
    correctIndex: 2,
  },
  {
    theme: "music",
    timeLimit: 20,
    text: "Quel instrument est associé à Miles Davis ?",
    choices: ["Saxophone", "Trompette", "Piano", "Contrebasse"],
    correctIndex: 1,
  },
  {
    theme: "music",
    timeLimit: 20,
    text: "Quel duo français a sorti 'Alors on danse' ?",
    choices: ["Daft Punk", "Stromae", "Bob Sinclar", "David Guetta"],
    correctIndex: 1,
  },
  {
    theme: "music",
    timeLimit: 15,
    text: "Dans quelle ville a vécu et est mort Mozart ?",
    choices: ["Berlin", "Paris", "Vienne", "Prague"],
    correctIndex: 2,
  },

  // ── HISTOIRE ──────────────────────────────────────────────────
  {
    theme: "history",
    timeLimit: 20,
    text: "En quelle année a eu lieu la Révolution française ?",
    choices: ["1776", "1789", "1799", "1804"],
    correctIndex: 1,
  },
  {
    theme: "history",
    timeLimit: 20,
    text: "Qui était le premier président des États-Unis ?",
    choices: [
      "Abraham Lincoln",
      "George Washington",
      "Thomas Jefferson",
      "Benjamin Franklin",
    ],
    correctIndex: 1,
  },
  {
    theme: "history",
    timeLimit: 15,
    text: "En quelle année s'est terminée la Seconde Guerre mondiale ?",
    choices: ["1943", "1944", "1945", "1946"],
    correctIndex: 2,
  },
  {
    theme: "history",
    timeLimit: 20,
    text: "Quelle civilisation a construit les pyramides de Gizeh ?",
    choices: ["Grecque", "Romaine", "Égyptienne", "Mésopotamienne"],
    correctIndex: 2,
  },
  {
    theme: "history",
    timeLimit: 15,
    text: "En quelle année est tombé le mur de Berlin ?",
    choices: ["1987", "1988", "1989", "1991"],
    correctIndex: 2,
  },
  {
    theme: "history",
    timeLimit: 20,
    text: "En quelle année Christophe Colomb a-t-il atteint l'Amérique ?",
    choices: ["1482", "1492", "1502", "1512"],
    correctIndex: 1,
  },
  {
    theme: "history",
    timeLimit: 20,
    text: "Quel empire était considéré le plus grand de l'histoire (superficie) ?",
    choices: ["Romain", "Britannique", "Mongol", "Ottoman"],
    correctIndex: 2,
  },
  {
    theme: "history",
    timeLimit: 20,
    text: "Qui a assassiné Abraham Lincoln ?",
    choices: [
      "Lee Harvey Oswald",
      "John Wilkes Booth",
      "Charles Guiteau",
      "James Earl Ray",
    ],
    correctIndex: 1,
  },
  {
    theme: "history",
    timeLimit: 20,
    text: "Quel pays a inventé l'imprimerie ?",
    choices: ["Égypte", "Corée", "Chine", "Allemagne"],
    correctIndex: 2,
  },
  {
    theme: "history",
    timeLimit: 20,
    text: "En quelle année a eu lieu la chute de Constantinople ?",
    choices: ["1353", "1453", "1553", "1653"],
    correctIndex: 1,
  },
  {
    theme: "history",
    timeLimit: 20,
    text: "Qui a lancé la Réforme protestante en 1517 ?",
    choices: ["Jean Calvin", "Henri VIII", "Martin Luther", "Érasme"],
    correctIndex: 2,
  },
  {
    theme: "history",
    timeLimit: 20,
    text: "Quel général a vaincu Napoléon à Waterloo ?",
    choices: ["Blücher", "Wellington", "Nelson", "Moore"],
    correctIndex: 1,
  },

  // ── GÉOGRAPHIE ────────────────────────────────────────────────
  {
    theme: "geography",
    timeLimit: 20,
    text: "Quel est le plus long fleuve d'Afrique ?",
    choices: ["Congo", "Niger", "Nil", "Zambèze"],
    correctIndex: 2,
  },
  {
    theme: "geography",
    timeLimit: 20,
    text: "Dans quel pays se trouve le Machu Picchu ?",
    choices: ["Bolivie", "Équateur", "Pérou", "Colombie"],
    correctIndex: 2,
  },
  {
    theme: "geography",
    timeLimit: 20,
    text: "Quelle est la capitale du Canada ?",
    choices: ["Toronto", "Vancouver", "Montréal", "Ottawa"],
    correctIndex: 3,
  },
  {
    theme: "geography",
    timeLimit: 15,
    text: "Quel est le plus haut sommet du monde ?",
    choices: ["K2", "Everest", "Kilimandjaro", "Mont Blanc"],
    correctIndex: 1,
  },
  {
    theme: "geography",
    timeLimit: 20,
    text: "Quelle est la plus grande île du monde ?",
    choices: ["Australie", "Groenland", "Nouvelle-Guinée", "Bornéo"],
    correctIndex: 1,
  },
  {
    theme: "geography",
    timeLimit: 15,
    text: "Par combien de pays la France est-elle frontalière ?",
    choices: ["6", "7", "8", "9"],
    correctIndex: 2,
  },
  {
    theme: "geography",
    timeLimit: 20,
    text: "Quel détroit sépare l'Espagne du Maroc ?",
    choices: [
      "Détroit de Messine",
      "Détroit de Gibraltar",
      "Bosphore",
      "Canal de Suez",
    ],
    correctIndex: 1,
  },
  {
    theme: "geography",
    timeLimit: 20,
    text: "Quelle est la plus grande forêt tropicale du monde ?",
    choices: ["Congo", "Amazonie", "Bornéo", "Nouvelle-Guinée"],
    correctIndex: 1,
  },
  {
    theme: "geography",
    timeLimit: 20,
    text: "Quelle ville est la plus peuplée du monde ?",
    choices: ["Shanghai", "Mumbai", "São Paulo", "Tokyo"],
    correctIndex: 3,
  },
  {
    theme: "geography",
    timeLimit: 20,
    text: "Dans quel continent se trouve l'Éthiopie ?",
    choices: ["Asie", "Moyen-Orient", "Afrique", "Océanie"],
    correctIndex: 2,
  },
  {
    theme: "geography",
    timeLimit: 20,
    text: "Quel fleuve traverse Paris ?",
    choices: ["Loire", "Rhône", "Seine", "Garonne"],
    correctIndex: 2,
  },
  {
    theme: "geography",
    timeLimit: 20,
    text: "Quel est le pays le plus peuplé d'Afrique ?",
    choices: ["Égypte", "RDC", "Éthiopie", "Nigeria"],
    correctIndex: 3,
  },

  // ── SCIENCE ───────────────────────────────────────────────────
  {
    theme: "science",
    timeLimit: 15,
    text: "Quel est le symbole chimique de l'or ?",
    choices: ["Go", "Or", "Au", "Ag"],
    correctIndex: 2,
  },
  {
    theme: "science",
    timeLimit: 15,
    text: "Combien de chromosomes possède un être humain ?",
    choices: ["23", "44", "46", "48"],
    correctIndex: 2,
  },
  {
    theme: "science",
    timeLimit: 15,
    text: "Quelle planète est la plus proche du Soleil ?",
    choices: ["Vénus", "Terre", "Mercure", "Mars"],
    correctIndex: 2,
  },
  {
    theme: "science",
    timeLimit: 20,
    text: "Quel scientifique a proposé la théorie de la relativité ?",
    choices: ["Newton", "Bohr", "Einstein", "Curie"],
    correctIndex: 2,
  },
  {
    theme: "science",
    timeLimit: 15,
    text: "À quelle température l'eau bout-elle au niveau de la mer ?",
    choices: ["90°C", "95°C", "100°C", "105°C"],
    correctIndex: 2,
  },
  {
    theme: "science",
    timeLimit: 20,
    text: "Quel organe produit l'insuline ?",
    choices: ["Foie", "Reins", "Pancréas", "Rate"],
    correctIndex: 2,
  },
  {
    theme: "science",
    timeLimit: 15,
    text: "Combien y a-t-il d'éléments dans le tableau périodique ?",
    choices: ["92", "100", "118", "126"],
    correctIndex: 2,
  },
  {
    theme: "science",
    timeLimit: 20,
    text: "Quel gaz représente environ 78 % de l'atmosphère terrestre ?",
    choices: ["Oxygène", "CO2", "Argon", "Azote"],
    correctIndex: 3,
  },
  {
    theme: "science",
    timeLimit: 20,
    text: "Quelle est la vitesse de la lumière (en km/s, arrondie) ?",
    choices: ["200 000", "300 000", "400 000", "500 000"],
    correctIndex: 1,
  },
  {
    theme: "science",
    timeLimit: 20,
    text: "Quel est l'élément le plus abondant dans l'univers ?",
    choices: ["Hélium", "Oxygène", "Hydrogène", "Carbone"],
    correctIndex: 2,
  },
  {
    theme: "science",
    timeLimit: 20,
    text: "Combien de dents possède un adulte avec les dents de sagesse ?",
    choices: ["28", "30", "32", "34"],
    correctIndex: 2,
  },
  {
    theme: "science",
    timeLimit: 15,
    text: "Quel est le symbole chimique du fer ?",
    choices: ["Fe", "Fr", "Fi", "Fo"],
    correctIndex: 0,
  },

  // ── JEUX VIDÉO ────────────────────────────────────────────────
  {
    theme: "games",
    timeLimit: 15,
    text: "Quel est le héros de la saga 'The Legend of Zelda' ?",
    choices: ["Zelda", "Link", "Ganon", "Epona"],
    correctIndex: 1,
  },
  {
    theme: "games",
    timeLimit: 15,
    text: "Quel jeu propose de construire et survivre avec des cubes ?",
    choices: ["Roblox", "Terraria", "Minecraft", "Fortnite"],
    correctIndex: 2,
  },
  {
    theme: "games",
    timeLimit: 15,
    text: "Quelle entreprise a créé la PlayStation ?",
    choices: ["Microsoft", "Nintendo", "Sony", "Sega"],
    correctIndex: 2,
  },
  {
    theme: "games",
    timeLimit: 15,
    text: "Dans quel jeu trouve-t-on des 'Creepers' ?",
    choices: ["Terraria", "Minecraft", "Roblox", "Among Us"],
    correctIndex: 1,
  },
  {
    theme: "games",
    timeLimit: 15,
    text: "Quel jeu de combat est célèbre pour ses 'Fatality' ?",
    choices: ["Street Fighter", "Tekken", "Mortal Kombat", "Soul Calibur"],
    correctIndex: 2,
  },
  {
    theme: "games",
    timeLimit: 15,
    text: "Dans quel jeu incarne-t-on Master Chief ?",
    choices: ["Call of Duty", "Battlefield", "Halo", "Gears of War"],
    correctIndex: 2,
  },
  {
    theme: "games",
    timeLimit: 15,
    text: "Quel personnage est la mascotte de Sega ?",
    choices: ["Tails", "Knuckles", "Sonic", "Shadow"],
    correctIndex: 2,
  },
  {
    theme: "games",
    timeLimit: 15,
    text: "Quel jeu consiste à trouver les 'imposteurs' parmi l'équipage ?",
    choices: ["Fall Guys", "Among Us", "Goose Game", "Party Animals"],
    correctIndex: 1,
  },
  {
    theme: "games",
    timeLimit: 20,
    text: "Quel est le jeu de tir tactique développé par Riot Games ?",
    choices: ["Overwatch", "CS:GO", "Valorant", "Apex Legends"],
    correctIndex: 2,
  },
  {
    theme: "games",
    timeLimit: 20,
    text: "Dans quel jeu open-world doit-on tuer des dragons et crier ?",
    choices: ["Dark Souls", "The Witcher 3", "Skyrim", "Dragon Age"],
    correctIndex: 2,
  },
  {
    theme: "games",
    timeLimit: 15,
    text: "Quel jeu mobile met en scène des oiseaux lancés sur des cochons ?",
    choices: ["Flappy Bird", "Temple Run", "Angry Birds", "Cut the Rope"],
    correctIndex: 2,
  },
  {
    theme: "games",
    timeLimit: 20,
    text: "Quelle série de jeux met en scène un détective appelé 'L' et 'Light' ?",
    choices: ["Danganronpa", "Ace Attorney", "Death Note", "Zero Escape"],
    correctIndex: 0,
  },

  // ── LOGOS & MARQUES ───────────────────────────────────────────
  {
    theme: "logos",
    timeLimit: 15,
    text: "Quelle marque a pour logo une virgule appelée 'swoosh' ?",
    choices: ["Adidas", "Nike", "Puma", "Reebok"],
    correctIndex: 1,
  },
  {
    theme: "logos",
    timeLimit: 15,
    text: "Quelle marque de voiture a pour logo quatre anneaux entrelacés ?",
    choices: ["BMW", "Mercedes", "Audi", "Volkswagen"],
    correctIndex: 2,
  },
  {
    theme: "logos",
    timeLimit: 15,
    text: "Quelle marque d'informatique a pour logo une pomme croquée ?",
    choices: ["Microsoft", "Google", "Apple", "Amazon"],
    correctIndex: 2,
  },
  {
    theme: "logos",
    timeLimit: 15,
    text: "Quelle chaîne de fast-food a pour logo un 'M' doré ?",
    choices: ["Burger King", "McDonald's", "KFC", "Subway"],
    correctIndex: 1,
  },
  {
    theme: "logos",
    timeLimit: 15,
    text: "Quelle marque de sport a pour logo trois bandes parallèles ?",
    choices: ["Nike", "Puma", "Adidas", "Under Armour"],
    correctIndex: 2,
  },
  {
    theme: "logos",
    timeLimit: 20,
    text: "Quelle marque de vêtements a pour logo un crocodile vert ?",
    choices: ["Ralph Lauren", "Lacoste", "Polo", "Fred Perry"],
    correctIndex: 1,
  },
  {
    theme: "logos",
    timeLimit: 15,
    text: "Quelle application avait pour logo un oiseau bleu ?",
    choices: ["Facebook", "Instagram", "Twitter/X", "Snapchat"],
    correctIndex: 2,
  },
  {
    theme: "logos",
    timeLimit: 15,
    text: "Quelle marque automobile italienne a pour logo un cheval cabré jaune ?",
    choices: ["Lamborghini", "Ferrari", "Alfa Romeo", "Maserati"],
    correctIndex: 1,
  },
  {
    theme: "logos",
    timeLimit: 15,
    text: "Quelle application a pour logo un fantôme blanc sur fond jaune ?",
    choices: ["WhatsApp", "Telegram", "Snapchat", "Discord"],
    correctIndex: 2,
  },
  {
    theme: "logos",
    timeLimit: 20,
    text: "Quelle marque de luxe a pour logo les lettres 'LV' entrelacées ?",
    choices: ["Versace", "Louis Vuitton", "Valentino", "Loewe"],
    correctIndex: 1,
  },
  {
    theme: "logos",
    timeLimit: 15,
    text: "Quelle marque de boisson a pour logo une vague rouge et blanche ?",
    choices: ["Pepsi", "Coca-Cola", "Dr Pepper", "7UP"],
    correctIndex: 1,
  },
  {
    theme: "logos",
    timeLimit: 20,
    text: "Quel réseau social a pour logo un appareil photo stylisé multicolore ?",
    choices: ["TikTok", "Pinterest", "Instagram", "Flickr"],
    correctIndex: 2,
  },

  // ── DRAPEAUX ──────────────────────────────────────────────────
  {
    theme: "flags",
    timeLimit: 20,
    text: "Quel pays a un drapeau avec un soleil blanc sur fond rouge ?",
    choices: ["Chine", "Corée", "Japon", "Vietnam"],
    correctIndex: 2,
  },
  {
    theme: "flags",
    timeLimit: 15,
    text: "Quel pays a un drapeau bleu, blanc, rouge à bandes verticales ?",
    choices: ["France", "Pays-Bas", "Russie", "Luxembourg"],
    correctIndex: 0,
  },
  {
    theme: "flags",
    timeLimit: 20,
    text: "Quel est le seul pays dont le drapeau national n'est pas rectangulaire ?",
    choices: ["Suisse", "Népal", "Vatican", "Qatar"],
    correctIndex: 1,
  },
  {
    theme: "flags",
    timeLimit: 15,
    text: "Quel pays a une feuille d'érable sur son drapeau ?",
    choices: ["Australie", "Nouvelle-Zélande", "Canada", "Fidji"],
    correctIndex: 2,
  },
  {
    theme: "flags",
    timeLimit: 20,
    text: "Quel pays a un drapeau avec l'Union Jack dans son coin supérieur gauche ?",
    choices: ["Australie", "Nouvelle-Zélande", "Fidji", "Tuvalu"],
    correctIndex: 0,
  },
  {
    theme: "flags",
    timeLimit: 15,
    text: "Quel pays a une croix blanche sur fond rouge ?",
    choices: ["Danemark", "Suisse", "Autriche", "Angleterre"],
    correctIndex: 1,
  },
  {
    theme: "flags",
    timeLimit: 20,
    text: "Quel pays a un drapeau vert–blanc–vert (bandes verticales) ?",
    choices: ["Côte d'Ivoire", "Nigeria", "Sénégal", "Ghana"],
    correctIndex: 1,
  },
  {
    theme: "flags",
    timeLimit: 20,
    text: "Quel pays a une étoile à cinq branches rouge sur fond blanc et rouge ?",
    choices: ["Tunisie", "Maroc", "Algérie", "Égypte"],
    correctIndex: 1,
  },
  {
    theme: "flags",
    timeLimit: 15,
    text: "De quelle couleur est le fond du drapeau brésilien ?",
    choices: ["Bleu", "Jaune", "Vert", "Rouge"],
    correctIndex: 2,
  },
  {
    theme: "flags",
    timeLimit: 20,
    text: "Quel pays nordique a une croix bleue sur fond jaune ?",
    choices: ["Finlande", "Norvège", "Danemark", "Suède"],
    correctIndex: 3,
  },
  {
    theme: "flags",
    timeLimit: 20,
    text: "Quel pays a un drapeau rouge avec une étoile jaune à cinq branches ?",
    choices: ["Corée du Nord", "Vietnam", "Chine", "Cuba"],
    correctIndex: 2,
  },
  {
    theme: "flags",
    timeLimit: 20,
    text: "Quel pays africain a un drapeau aux couleurs vert, rouge et jaune avec une étoile noire ?",
    choices: ["Sénégal", "Mali", "Ghana", "Cameroun"],
    correctIndex: 2,
  },
];

// Attach stable IDs
export const QUESTION_BANK: Question[] = RAW.map((q, i) => ({
  ...q,
  id: `${q.theme}_${String(i).padStart(3, "0")}`,
}));

/**
 * Pick `count` questions for the given theme (or all themes).
 * If not enough in the theme, pulls from other themes.
 */
export function pickQuestions(theme: string, count: number): Question[] {
  const pool =
    theme === "all"
      ? [...QUESTION_BANK]
      : [...QUESTION_BANK.filter((q) => q.theme === theme)];

  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  if (pool.length >= count) return pool.slice(0, count);

  // not enough — fill from other themes
  const extra = QUESTION_BANK.filter((q) => q.theme !== theme)
    .sort(() => Math.random() - 0.5)
    .slice(0, count - pool.length);

  return [...pool, ...extra].slice(0, count);
}
