import path from "path";

export const DB_PATH: string = path.join(__dirname, "..", "crawler.db");
export const DASHBOARD_HOST: string = "45.77.23.140";

export const DB_BACKEND: string = process.env.DB_BACKEND || "sqlite";
export const REDIS_ENABLED: boolean = process.env.REDIS_ENABLED === "true";
export const KAFKA_ENABLED: boolean = process.env.KAFKA_ENABLED === "true";
export const ES_ENABLED: boolean = process.env.ES_ENABLED === "true";

export const PG_HOST: string = process.env.PG_HOST || "localhost";
export const PG_PORT: number = parseInt(process.env.PG_PORT!) || 5432;
export const PG_DATABASE: string = process.env.PG_DATABASE || "webindexer";
export const PG_USER: string = process.env.PG_USER || "webindexer";
export const PG_PASSWORD: string = process.env.PG_PASSWORD || "secret";

export const REDIS_HOST: string = process.env.REDIS_HOST || "localhost";
export const REDIS_PORT: number = parseInt(process.env.REDIS_PORT!) || 6379;
export const REDIS_PASSWORD: string = process.env.REDIS_PASSWORD || "";

export const KAFKA_BROKERS: string[] = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");

export const ES_NODE: string = process.env.ES_NODE || "http://localhost:9200";
export const ES_INDEX: string = process.env.ES_INDEX || "pages";

export const MAX_NODES: number = 50000000;
export const MAX_FRONTIER: number = 10000000;
export const CONCURRENCY: number = 2;
export const DOMAIN_LIMIT: number = 2;
export const DOMAIN_MAX: number = 200;
export const QUEUE_LOW_WATER: number = 10000;
export const SEED_BATCH: number = 500;
export const MIN_DISK_MB: number = 500;
export const DISK_MAX_USAGE_PCT: number = 80;
export const TREE_CACHE_TTL: number = 120000;
export const CLEAR_INTERVAL_MS: number = 30000;
export const DISK_CHECK_INTERVAL_MS: number = 60000;
export const MAX_DEPTH: number = 10;
export const FETCH_TIMEOUT: number = 1500;
export const DNS_TIMEOUT: number = 1500;
export const FRONTIER_MAX: number = 50000;

export const BLACKLIST: Set<string> = new Set([
  "facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com", "snapchat.com",
  "linkedin.com", "pinterest.com", "reddit.com", "threads.net", "mastodon.social",
  "doubleclick.net", "googlesyndication.com", "google-analytics.com", "googletagmanager.com",
  "ads.yahoo.com", "advertising.com", "facebook.net", "fbcdn.net",
  "amazon-adsystem.com", "adservice.google.com", "pagead2.googlesyndication.com",
  "adnxs.com", "adsrvr.org", "demdex.net", "casalemedia.com",
  "cloudflareinsights.com", "bat.bing.com", "mc.yandex.ru",
  "amazonaws.com", "cloudfront.net", "akamaihd.net",
  "quantserve.com", "scorecardresearch.com", "bluekai.com",
  "rubiconproject.com", "pubmatic.com", "openx.net",
  "criteo.com", "criteo.net", "taboola.com", "outbrain.com",
]);

export const WIKI_LANGS: string[] = [
  "en", "ru", "de", "fr", "es", "ja", "zh", "pt", "it", "pl", "nl", "sv",
  "ar", "tr", "uk", "vi", "th", "id", "ko", "cs", "fi", "no", "da", "he",
  "ro", "hu", "bn", "fa",
];

export const WIKI_TOPICS: string[] = [
  "History", "Science", "Mathematics", "Physics", "Chemistry", "Biology", "Medicine",
  "Astronomy", "Geology", "Ecology", "Evolution", "Genetics", "Neuroscience",
  "Philosophy", "Psychology", "Sociology", "Anthropology", "Economics", "Politics",
  "Geography", "Architecture", "Music", "Literature", "Art", "Film", "Theater",
  "Television", "Video_games", "Sports", "Chess", "Football", "Basketball",
  "Agriculture", "Engineering", "Robotics", "Automation", "Telecommunications",
  "Electricity", "Nuclear_energy", "Solar_energy", "Wind_power", "Climate_change",
  "Democracy", "Capitalism", "Socialism", "Revolution", "War", "Peace",
  "Ancient_Rome", "Ancient_Greece", "Ancient_Egypt", "Medieval", "Renaissance",
  "Industrial_Revolution", "Cold_War", "World_War_II", "World_War_I",
  "Einstein", "Newton", "Tesla", "Edison", "Darwin", "Curie", "Hawking",
  "Shakespeare", "Mozart", "Beethoven", "Da_Vinci", "Michelangelo",
  "Quantum_mechanics", "Relativity", "String_theory", "Dark_matter", "Black_hole",
  "DNA", "Protein", "Virus", "Bacteria",
  "Coffee", "Tea", "Beer", "Wine", "Bread", "Pizza", "Sushi",
  "Dinosaur", "Mammal", "Bird", "Fish", "Insect", "Spider",
  "Ocean", "Mountain", "River", "Desert", "Forest", "Island",
  "Sun", "Moon", "Mars", "Jupiter", "Saturn", "Milky_Way",
  "Apollo_program", "International_Space_Station", "Hubble_Space_Telescope",
];

export const SEEDS: string[] = [
  "https://news.ycombinator.com", "https://news.ycombinator.com/news?p=2", "https://news.ycombinator.com/news?p=3",
  "https://lobste.rs", "https://old.reddit.com/r/programming", "https://old.reddit.com/r/javascript",
  "https://old.reddit.com/r/python", "https://old.reddit.com/r/rust", "https://old.reddit.com/r/golang",
  "https://old.reddit.com/r/technology", "https://old.reddit.com/r/science", "https://old.reddit.com/r/space",
  "https://old.reddit.com/r/worldnews", "https://old.reddit.com/r/MachineLearning",
  "https://github.com/trending", "https://github.com/trending/python", "https://github.com/trending/javascript",
  "https://github.com/trending/rust", "https://github.com/trending/go", "https://github.com/trending/typescript",
  "https://stackoverflow.com/questions", "https://stackoverflow.com/tags",
  "https://dev.to", "https://medium.com", "https://hashnode.com",
  "https://arstechnica.com", "https://www.theverge.com", "https://techcrunch.com",
  "https://www.wired.com", "https://www.technologyreview.com", "https://thenewstack.io",
  "https://hackaday.com", "https://www.omgubuntu.co.uk", "https://www.phoronix.com",
  "https://www.infoq.com", "https://daringfireball.net", "https://stratechery.com",
  "https://www.anandtech.com", "https://arxiv.org/list/cs.AI/recent",
  "https://arxiv.org/list/cs.CL/recent", "https://arxiv.org/list/cs.LG/recent",
  "https://arxiv.org/list/cs.CR/recent", "https://arxiv.org/list/cs.SE/recent",
  "https://pubmed.ncbi.nlm.nih.gov/", "https://scholar.google.com",
  "https://www.nature.com", "https://www.science.org", "https://www.sciencedaily.com",
  "https://phys.org", "https://www.space.com", "https://science.nasa.gov",
  "https://www.bbc.com/news", "https://www.bbc.com/future",
  "https://www.theguardian.com/technology", "https://www.reuters.com/technology",
  "https://apnews.com/technology", "https://www.aljazeera.com/economy",
  "https://www.economist.com", "https://foreignpolicy.com",
  "https://www.nationalgeographic.com", "https://www.smithsonianmag.com",
  "https://www.npr.org/sections/technology/", "https://www.pbs.org/wgbh/nova",
  "https://www.imdb.com", "https://www.rottentomatoes.com",
  "https://developer.mozilla.org/en-US/docs/Web", "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  "https://developer.mozilla.org/en-US/docs/Web/CSS", "https://developer.mozilla.org/en-US/docs/Web/API",
  "https://docs.python.org/3/", "https://go.dev/doc/", "https://doc.rust-lang.org/book/",
  "https://nodejs.org/en/docs", "https://react.dev", "https://vuejs.org",
  "https://angular.io", "https://svelte.dev", "https://nextjs.org",
  "https://www.typescriptlang.org/docs/", "https://expressjs.com/",
  "https://fastify.dev/", "https://kubernetes.io/docs/",
  "https://docs.docker.com/", "https://blog.cloudflare.com",
  "https://www.w3.org/standards/", "https://www.w3.org/TR/",
  "https://openjdk.org", "https://kotlinlang.org/docs/",
  "https://swift.org/documentation/", "https://www.rust-lang.org/learn",
  "https://learn.microsoft.com/en-us/dotnet/", "https://learn.microsoft.com/en-us/windows/",
  "https://wiki.haskell.org/Haskell", "https://www.scala-lang.org/documentation/",
  "https://cran.r-project.org", "https://www.r-project.org",
  "https://julialang.org", "https://jupyter.org",
  "https://pypi.org", "https://www.npmjs.com", "https://crates.io",
  "https://rubygems.org", "https://packagist.org",
  "https://www.linuxfoundation.org", "https://ubuntu.com",
  "https://www.debian.org", "https://archlinux.org",
  "https://www.redhat.com", "https://fedoraproject.org",
  "https://www.freebsd.org", "https://openbsd.org",
  "https://www.gnome.org", "https://kde.org",
  "https://www.xfce.org", "https://cmake.org",
  "https://www.qt.io", "https://gtk.org",
  "https://www.torrentfreak.com", "https://arstechnica.com/civis/",
  "https://www.slashdot.org", "https://digg.com",
  "https://www.producthunt.com", "https://news.ycombinator.com/best",
  "https://www.reddit.com/r/askreddit/top/?t=week",
  "https://www.reddit.com/r/todayilearned/top/?t=week",
  "https://www.reddit.com/r/explainlikeimfive/top/?t=week",
  "https://www.reddit.com/r/dataisbeautiful/top/?t=week",
  "https://www.reddit.com/r/InternetIsBeautiful/top/?t=week",
  "https://en.wikipedia.org/wiki/Special:Random",
  "https://ru.wikipedia.org/wiki/Special:Random",
  "https://de.wikipedia.org/wiki/Special:Random",
  "https://fr.wikipedia.org/wiki/Special:Random",
  "https://es.wikipedia.org/wiki/Special:Random",
  "https://ja.wikipedia.org/wiki/Special:Random",
  "https://zh.wikipedia.org/wiki/Special:Random",
  "https://pt.wikipedia.org/wiki/Special:Random",
  "https://it.wikipedia.org/wiki/Special:Random",
  "https://pl.wikipedia.org/wiki/Special:Random",
  "https://nl.wikipedia.org/wiki/Special:Random",
  "https://sv.wikipedia.org/wiki/Special:Random",
  "https://ar.wikipedia.org/wiki/Special:Random",
  "https://tr.wikipedia.org/wiki/Special:Random",
  "https://uk.wikipedia.org/wiki/Special:Random",
  "https://vi.wikipedia.org/wiki/Special:Random",
  "https://th.wikipedia.org/wiki/Special:Random",
  "https://id.wikipedia.org/wiki/Special:Random",
  "https://ko.wikipedia.org/wiki/Special:Random",
  "https://cs.wikipedia.org/wiki/Special:Random",
  "https://fi.wikipedia.org/wiki/Special:Random",
  "https://no.wikipedia.org/wiki/Special:Random",
  "https://da.wikipedia.org/wiki/Special:Random",
  "https://he.wikipedia.org/wiki/Special:Random",
  "https://ro.wikipedia.org/wiki/Special:Random",
  "https://hu.wikipedia.org/wiki/Special:Random",
  "https://bn.wikipedia.org/wiki/Special:Random",
  "https://fa.wikipedia.org/wiki/Special:Random",
  "https://www.theregister.com", "https://www.osnews.com",
  "https://lwn.net", "https://www.extremetech.com",
  "https://www.zdnet.com", "https://www.cnet.com",
  "https://mashable.com", "https://www.engadget.com",
  "https://gizmodo.com", "https://jalopnik.com",
  "https://kotaku.com", "https://deadspin.com",
  "https://lifehacker.com", "https://howtogeek.com",
  "https://www.makeuseof.com", "https://www.digitaltrends.com",
  "https://www.pcworld.com", "https://www.tomshardware.com",
  "https://www.anandtech.com", "https://www.tweaktown.com",
  "https://www.techpowerup.com", "https://www.guru3d.com",
  "https://www.blockchain.com/explorer",
  "https://dribbble.com", "https://www.behance.net",
  "https://www.figma.com/community", "https://codepen.io",
  "https://jsfiddle.net", "https://repl.it",
  "https://www.hackerrank.com", "https://leetcode.com",
  "https://www.codechef.com", "https://codeforces.com",
  "https://adventofcode.com", "https://projecteuler.net",
  "https://www.gutenberg.org", "https://archive.org",
  "https://www.imdb.com/chart/top", "https://www.metacritic.com",
  "https://www.goodreads.com", "https://openlibrary.org",
  "https://www.allmusic.com", "https://rateyourmusic.com",
  "https://www.wikihow.com", "https://www.instructables.com",
  "https://www.kickstarter.com", "https://www.indiegogo.com",
  "https://www.gofundme.com", "https://patreon.com",
  "https://www.change.org", "https://www.coursera.org",
  "https://www.edx.org", "https://www.khanacademy.org",
  "https://www.ted.com", "https://www.masterclass.com",
  "https://www.medium.com/tag/programming/recommended",
  "https://www.slashdot.org",
];
