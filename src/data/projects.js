export const projects = [
  {
    id: 'healthcare_app',
    title: 'Healthcare Data Platform',
    type: 'Personal Project',
    category: 'featured',
    group: 'fullstack',
    summary:
      'A full-stack healthcare platform built with Django, PostgreSQL, and React focused on patient, encounter, and condition data management.',
    impact:
      'Designed the relational database architecture, imported large synthetic healthcare datasets through ETL pipelines, built admin tooling, and designed Metabase SQL dashboards for healthcare analytics and reporting',
    description:
      'This project was created to deepen my experience with backend engineering, healthcare data systems, and full-stack architecture. The platform uses Django and PostgreSQL to model healthcare relationships between patients, encounters, and medical conditions while supporting authenticated admin workflows and scalable data management practices. I built ETL scripts to process and import synthetic Synthea healthcare datasets into a normalized PostgreSQL schema, allowing realistic testing against large relational datasets. The project also includes Django admin tooling, role-based access controls, REST-ready backend architecture, and a React frontend environment prepared for future patient and analytics interfaces. Along the way I gained hands-on experience with database migrations, ORM relationships, ETL concepts, PostgreSQL administration, Docker-based tooling, and healthcare-oriented backend design. I also integrated Metabase for exploratory healthcare analytics and dashboarding, using SQL-driven visualizations on top of the PostgreSQL schema to better understand reporting workflows, aggregations, and healthcare operational metrics.',
    images: [
      'healthcare_app/1.png',
      'healthcare_app/2.png',
      'healthcare_app/3.png',
      'healthcare_app/5.png',
      'healthcare_app/4.png',
    ],
    tech: [
      'Django',
      'Python',
      'PostgreSQL',
      'React',
      'Docker',
      'REST APIs',
      'ETL',
      'pgAdmin',
      'Synthea',
      'MetaBase',
    ],
    links: [
      {
        name: 'GitLab Repo',
        url: 'https://gitlab.com/Sjskyler27/healthcare_app',
      },
      { name: 'Demo', url: 'https://healthcaretestapp.netlify.app/' },
      {
        name: 'Admin',
        url: 'https://healthcare-app-khaki-seven.vercel.app/admin/',
      },
    ],
  },
  {
    id: 'home_assistant_automation',
    title: 'Home Assistant Automation Hub',
    type: 'Personal Project',
    category: 'featured',
    group: 'fullstack',
    summary:
      'A self-hosted smart home automation system built with Home Assistant, Docker, webhooks, NFC tags, and media integrations for family-focused household workflows.',
    impact:
      'Built a Docker-based Home Assistant environment with custom webhook automations, NFC-triggered actions, Discord notifications, Steam auto-launching, Plex media playback, photo book workflows, and child-friendly physical media controls using QR/NFC tags.',
    description:
      'This project was created to explore self-hosted automation, local networking, media control, and practical smart home workflows. I built and configured a Home Assistant environment running in Docker and connected it to household devices, media services, webhooks, and custom scripts. A major focus of the project was creating physical interaction points for my daughter, including NFC tags and QR-style “modern DVD” cards that can trigger family-friendly media, playlists, Plex movies, YouTube videos, or other home actions without needing to navigate apps manually. I also built webhook-based automations for Discord notifications, phone actions, Steam game launching, and media playback across devices. The project included learning Docker container management, Home Assistant YAML configuration, webhook routing, local network troubleshooting, SSH-based Windows automation, Tasker mobile integrations, Plex/Jellyfin-style media workflows, NFC limitations, and smart home debugging. Along the way I gained hands-on experience connecting cloud services, local devices, scripts, and self-hosted infrastructure into one practical automation hub for entertainment, family routines, and household control.',
    images: [
      'home_assistant_automation/1.png',
      'home_assistant_automation/2.png',
    ],
    tech: [
      'Home Assistant',
      'Docker',
      'YAML',
      'Claude',
      'Webhooks',
      'NFC Tags',
      'QR Codes',
      'Tasker',
      'Discord Webhooks',
      'SSH',
      'PowerShell',
      'Windows Automation',
      'Local Networking',
      'Media Automation',
    ],
    links: [],
  },
  {
    id: 'everee_payroll_integration',
    title: 'Everee Payroll API Integration',
    notReady: true,
    type: 'Professional Work',
    category: 'featured',
    group: 'backend',
    summary:
      'A third-party payroll (Everee) integration built in Rust, exposing worker payroll-onboarding status to a Flutter client through a cached, authenticated API endpoint.',
    impact:
      'Built a Rust integration with a third-party payroll provider — an authenticated HTTP client, a session-scoped onboarding-status endpoint with TTL caching, and deterministic mocked-HTTP test coverage — serving payroll status to a Flutter payments screen.',
    description:
      'This work focused on integrating a third-party payroll provider (Everee) into a production marketplace platform using Rust. I built the integration from the HTTP layer up: a shared request client that authenticates every call with HTTP Basic auth and the required multi-tenant headers, and a session-scoped endpoint that returns a worker’s payroll-onboarding status. I implemented the identifier model that maps internal user IDs to the vendor’s external and internal worker IDs, added in-memory TTL caching to eliminate redundant upstream calls, and wrote explicit error handling that maps not-found responses to a clean "not onboarded" result. I designed the test strategy around mocked HTTP and PII-scrubbed JSON fixtures so the suite is fully deterministic and never depends on live vendor data, covering the success, incomplete, and not-found paths as well as the auth-header construction. The endpoint connects end-to-end to a Flutter Payments screen, where a "Payroll Onboarding" banner renders only when a worker’s onboarding is incomplete.',
    images: [
      'everee_payroll_integration/1.png',
      'everee_payroll_integration/2.png',
      'everee_payroll_integration/3.png',
    ],
    tech: [
      'Rust',
      'Flutter',
      'Dart',
      'PostgreSQL',
      'Docker',
      'REST APIs',
      'Moka',
    ],
    links: [],
  },
  {
    id: 'heat',
    title: 'Bot Predictions for HEAT',
    type: 'Personal Tool',
    category: 'featured',
    group: 'personal',
    summary:
      'A Python simulation tool that estimated board game map time and difficulty from bot racing data.',
    impact:
      'Ran hundreds of race simulations per map and produced predictions that landed within a few minutes of real play sessions.',
    description:
      'This was a fun use of both Python and Excel. I created a Python script that modeled the bot mechanics for the board game HEAT. The bot had functions for reading map values, drawing cards, moving, and handling corners. The race function loaded track data from an Excel spreadsheet with distance from corners, distance from start, corner speed, and other values. I ran hundreds of simulations for every track and logged the data. Time was estimated from average bot turns multiplied by average player turn time. Difficulty was based on patterns in corner rate, since maps where bots passed corners more quickly tended to be harder for players. I posted my findings on the forum and the times were accurate to within two or three minutes of my predictions.',
    images: [
      'https://cf.geekdo-images.com/-vOrd4bOspibyohYExLqWg__imagepage/img/k4uPIqjYuWBzofFiCyjSWN6KJow=/fit-in/900x600/filters:no_upscale():strip_icc()/pic6940449.png',
      'https://cf.geekdo-images.com/GpyIgLpb_eSOsC9Y05nmyw__imagepage/img/enHJ780fj7F8GZsNLtzUylEdhVQ=/fit-in/900x600/filters:no_upscale():strip_icc()/pic7427299.png',
      'https://cf.geekdo-images.com/S1KkjFX5vodPEcF94wGtHQ__imagepage/img/VWH3CKPqRsoHDQ1v76A5VGMMI_o=/fit-in/900x600/filters:no_upscale():strip_icc()/pic7427298.png',
    ],
    tech: ['Python', 'OpenPyXL', 'Excel', 'Simulation', 'Data Analysis'],
    links: [
      {
        name: 'Github Repo',
        url: 'https://github.com/Sjskyler27/HEATMAPTEST',
      },
      {
        name: 'Forum Post',
        url: 'https://boardgamegeek.com/thread/3055787/article/42258347#42258347',
      },
    ],
  },
  {
    id: 'wordis',
    title: 'Wordis',
    type: 'Hackathon',
    category: 'featured',
    group: 'hackathon',
    summary:
      'A bananagrams rogue like developed in vue and deployed with electron created for a 2 week hackathon',
    impact:
      'Built the full game loop, CSS animation system, persistent saves, offline support, controller support, and a playable web release.',
    description:
      'In just two weeks I created a full fledged Bananagrams-inspired roguelike using Vue and Electron. The project features local saves for offline play, Firebase login and cloud sync across devices, controller support, animated UI systems, and a complete gameplay loop inspired by modern roguelikes like Balatro. I handled the full frontend architecture, game state management, progression systems, persistence layer, responsive layouts, and deployment pipeline for the playable web release.',
    images: ['wordis/1.png', 'wordis/2.png', 'wordis/3.png'],
    tech: ['Vue', 'Firebase', 'Electron', 'SCSS', 'Local Storage', 'Netlify'],
    links: [
      {
        name: 'Play Wordis',
        url: 'https://wavedash.com/games/wordis',
      },
    ],
  },
  {
    id: 'stonecrest',
    title: 'Stonecrest Rentals',
    type: 'Professional',
    category: 'featured',
    group: 'professional',

    summary:
      'A rental platform with relational data modeling, admin tooling, and editable business content that allows users to rent office space.',

    impact:
      'Led the project from discovery and Figma planning through backend architecture, frontend implementation, deployment, and ongoing feature delivery.',

    description:
      'Worked as a solo full-stack contractor for Stonecrest Rentals to help turn a manual, word-of-mouth rental process into a maintainable web platform. I collaborated directly with the client to design both the customer and admin experience in Figma, planned the relational database structure using dbdiagram, and built the backend with Node, Sequelize, and Swagger. The application was deployed through Render with a React frontend hosted on Netlify. I managed development through weekly sprint planning and progress reviews while building both user-facing pages and internal admin tooling. The admin system allowed the company to manage rooms, locations, amenities, pricing, branding, and page content without requiring developer involvement.',

    images: [
      'https://i.ibb.co/7zZ23JW/image.png',
      'https://i.ibb.co/Cm5Dm9t/image.png',
      'https://i.ibb.co/6BBSyMC/image.png',
      'https://i.ibb.co/bvNBrJk/image.png',
    ],

    tech: [
      'React',
      'Node',
      'Sequelize',
      'Swagger',
      'Render',
      'Netlify',
      'Figma',
    ],

    links: [
      {
        name: 'GitHub Backend Repo',
        url: 'https://github.com/Sjskyler27/stonecrest-suites-backend',
      },
      {
        name: 'Github Frontend Repo',
        url: 'https://github.com/Sjskyler27/stonecrest-suites',
      },
      {
        name: 'Demo',
        url: 'https://stoncrestsuites.netlify.app',
      },
    ],
  },
  {
    id: 'app-rebuild',
    title: 'onDiem App Rebuild',
    type: 'Professional',
    category: 'featured',
    group: 'professional',

    summary:
      'A full rebuild of the onDiem mobile application using Flutter, Rust services, and AI-assisted development workflows.',

    impact:
      'Helped deliver a modernized mobile experience with faster iteration, improved onboarding, ranking-based shift matching, and migration support for existing users.',

    description:
      'Contributed to a rapid rebuild of the onDiem mobile application using Flutter for the client experience and Rust-backed services for newer platform functionality. The project focused on improving usability, modernizing the application architecture, and streamlining the onboarding and shift discovery experience. New features included ranking-based shift matching, guest browsing before login, and smoother migration support for existing users moving to the new platform. Development emphasized fast iteration and structured AI-assisted workflows using Claude and Ralph looping processes to accelerate implementation, planning, and refinement across the team.',

    images: [
      'app-rebuild/1.png',
      'app-rebuild/2.png',
      'app-rebuild/3.png',
      'app-rebuild/4.png',
    ],

    tech: [
      'Flutter',
      'Rust',
      'Dart',
      'AI-assisted development',
      'Claude',
      'Ralph Loops',
    ],

    links: [],
  },
  {
    id: 'component-library',
    title: 'Component Library',
    type: 'Professional',
    category: 'featured',
    group: 'professional',
    summary:
      'A shared OnDiem component catalog that helped design and development teams build consistently.',
    impact:
      'Created a single source for reusable UI patterns so teams could inspect components in action and maintain a more cohesive product experience.',
    description:
      'I developed a comprehensive component library for OnDiem, designed to standardize and streamline the components used across our website. This library serves as a single, unified resource for our design and development teams, ensuring consistency and efficiency in our workflow. It provides an extensive catalog of all components in action, offering designers an easy and intuitive way to explore, understand, and implement these elements in their projects.',
    images: [
      'component_library/image_1.png',
      'component_library/image_2.png',
      'component_library/image_3.png',
    ],
    tech: ['Vue', 'SCSS', 'GitHub Pages', 'Design Systems'],
    links: [
      {
        name: 'Component Library',
        url: 'https://ondiem.github.io/library/',
      },
    ],
  },
  {
    id: 'state-partnerships',
    title: 'State Partnerships',
    type: 'Professional',
    category: 'supporting',
    group: 'professional',

    summary:
      'Public state partnership pages that let candidates browse available jobs before creating an account.',

    impact:
      'Improved candidate discovery and gave partner associations a simple, shareable way to promote local opportunities.',

    description:
      'Built public-facing partnership pages for OnDiem’s state association partners through the ADHA. Before this project, users had to complete account creation before seeing available jobs in their area. These pages allowed candidates to browse state-specific listings, apply filters, and preview job details before signing up. I also helped support the admin tooling that allowed new partnership pages to be added and managed quickly as additional states joined the platform.',

    images: ['state/1.png', 'state/2.png', 'state/3.png'],

    tech: ['Vue', 'Filtering Systems', 'Admin Tools', 'Public Pages'],

    links: [],
  },
  {
    id: 'membership-template',
    title: 'Membership Template',
    type: 'Professional',
    category: 'supporting',
    group: 'professional',
    summary:
      'A reusable membership page structure built to support ADHA, CDHA, and future partners.',
    impact:
      'Reduced future partner setup by making membership content flexible enough for multiple organizations.',
    description:
      'I reworked our ADHA membership page to account for other memberships. OnDiem partnered with the CDHA to allow memberships and we anticipated more memberships in the future. I created the memberships page to account for future memberships with various partners.',
    images: ['cdha/1.png', 'cdha/2.png', 'cdha/3.png'],
    tech: ['Vue', 'SCSS', 'Reusable Templates'],
    links: [],
  },
  {
    id: 'dungeon-draft',
    title: 'Dungeon Draft',
    type: 'Hackathon',
    category: 'featured',
    group: 'hackathon',
    summary:
      'A card-based push-your-luck game built in Vue and packaged for steam.',
    impact:
      'Built the full game loop, CSS animation system, persistent saves, offline support, controller support, and a playable web release.',
    description:
      'I used Vue.js to create a card based push your luck game. I used Electron to package the game and release my game through Steam for both Windows and Mac with controller support. The game uses CSS for all animations. Users are able to save their progress across multiple devices and can run offline. Feel free to check out a free version with the link below.',
    images: [
      'dungeon_draft/image_1.png',
      'dungeon_draft/image_2.png',
      'dungeon_draft/image_3.png',
    ],
    tech: ['Vue', 'Electron', 'SCSS', 'Local Storage', 'Netlify'],
    links: [
      {
        name: 'Play Dungeon Draft',
        url: 'https://dungeondraft.netlify.app/',
      },
    ],
  },
  {
    id: 'itch',
    title: 'Itch Programming for Kids',
    type: 'Hackathon',
    category: 'supporting',
    group: 'school',
    summary:
      'A hackathon learning site that helps kids move from block coding toward text-based programming.',
    impact: 'Built in 24 hours with a team and awarded third place.',
    description:
      'Itch is a programming website aimed to help children transition from block coding like Scratch to coding with languages like Python and VB. My team and I had 24 hours to complete this website as part of a hackathon. We created our website using Vue, HTML, CSS, JavaScript, and Netlify. We were awarded third place.',
    images: [
      'https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png',
      'https://i.ibb.co/PQGMGZv/image.png',
      'https://i.ibb.co/YTL8WB3/image.png',
    ],
    tech: ['Vue', 'JavaScript', 'CSS', 'Netlify'],
    links: [
      {
        name: 'GitHub Repo',
        url: 'https://github.com/Sjskyler27/itch/',
      },
      { name: 'Live Demo', url: 'https://itch.netlify.app/code' },
      {
        name: 'YouTube Demonstration',
        url: 'https://youtu.be/FZvFJNQyTms',
      },
    ],
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    type: 'Professional',
    category: 'supporting',
    group: 'professional',
    summary:
      'Subscription functionality for practices with special posting and payment privileges.',
    impact:
      'Supported a new business model for practices by introducing subscription-aware product flows.',
    description:
      'We worked on implementing a subscription service for our practices that allows them special privileges such as converting temporary job posts to permanent reduced markup payments and other privileges.',
    images: [
      'subscriptions/1.png',
      'subscriptions/2.png',
      'subscriptions/3.png',
      'subscriptions/4.png',
    ],
    tech: ['Vue', 'Billing UX', 'Practice Workflows'],
    links: [],
  },
  {
    id: 'onboarding',
    title: 'Onboarding Flow',
    type: 'Professional',
    category: 'featured',
    group: 'professional',
    summary:
      'A resumable onboarding workflow that combined several credentialing steps into one guided flow.',
    impact:
      'Reduced application friction by allowing users to apply before final license approval while keeping practices protected from unapproved applicants.',
    description:
      'I enhanced the onboarding flow for our users by utilizing the overlay module from the library to streamline the initial onboarding process. This project combined Basic Information, EEOC, Employee Handbook, Credentials, and Additional Verifications into a single flow. I implemented functionality that allows users to save their progress and resume the onboarding journey at any point, with notifications on the main dashboard that return the user to their spot. Previously a user had to have their state license approved before they could start applying for jobs. Now users can apply for jobs before being approved, substantially improving application time. Practices will only see applications from users that have been approved, and if a user is not approved they receive an email notification when credentials are declined.',
    images: [
      'onboarding/1.png',
      'onboarding/2.png',
      'onboarding/3.png',
      'onboarding/4.png',
      'onboarding/5.png',
    ],
    tech: ['Vue', 'Forms', 'Dashboard UX', 'Credentialing'],
    links: [],
  },
  {
    id: 'codenames',
    title: 'CodeNames',
    type: 'School / Game',
    category: 'supporting',
    group: 'school',
    summary:
      'A full-stack recreation of Code Names and Code Names Duet with generated board solutions.',
    impact:
      'Solved tricky JavaScript logic for multiplayer game setup, team layouts, and Duet solution generation.',
    description:
      'This website is a recreation of the popular board game Code Names and its variant Code Names Duet. Two teams try to guess all of their words before the other. Two code masters look at their solution to give hints to their team. This full stack project had a lot of fun JavaScript problems, particularly around generating the solutions for teams in the duet version.',
    images: [
      'https://i.ibb.co/xhF5CxB/image.png',
      'https://i.ibb.co/JjjNSGp/image.png',
      'https://i.ibb.co/kKSWSnv/image.png',
    ],
    tech: ['JavaScript', 'Node', 'Game Logic', 'Netlify'],
    links: [
      {
        name: 'GitHub Repo',
        url: 'https://github.com/Sjskyler27/codenames/',
      },
      {
        name: 'Live Demo',
        url: 'https://codenamesbyskyler.netlify.app/',
      },
      {
        name: 'YouTube Demonstration',
        url: 'https://youtu.be/837LC4l-2mg?si=4VBvupHLTMw_P1Qe',
      },
    ],
  },
];
