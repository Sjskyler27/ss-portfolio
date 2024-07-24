<template>
  <div id="app">
    <div style="display: grid; grid-template-columns: 3fr auto">
      <h1>Skyler Simpsons Portfolio</h1>
      <div style="align-items: center">
        <!-- <a
          href="skylersimpson1-9-24.pdf"
          target="_blank"
          class="view-pdf-button"
        >
          My Resume
        </a> -->
      </div>
    </div>
    <div id="centered-container">
      <br />
      <div class="menu">
        <h1 @click="projectView = 'about'">About Me</h1>
        <h1 @click="projectView = 'school'">School Projects</h1>
        <h1 @click="projectView = 'career'">Career Projects</h1>
      </div>
      <div v-if="projectView == 'about'">
        <br />
        <AboutMe2></AboutMe2>
      </div>
      <div v-if="projectView == 'career'">
        <ProjectComponent
          title="Onboarding Proccess"
          description="I developed a comprehensive component library for OnDiem, designed to standardize and streamline the components used across our website. This library serves as a single, unified resource for our design and development teams, ensuring consistency and efficiency in our workflow. It provides an extensive catalog of all components in action, offering designers an easy and intuitive way to explore, understand, and implement these elements in their projects. This initiative has significantly enhanced our ability to maintain a cohesive and high-quality user experience throughout our digital platform."
          image="https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png"
          :images="[
            'component_library/image_1.png',
            'component_library/image_2.png',
            'component_library/image_3.png',
          ]"
          :links="[
            {
              name: 'Component Library',
              url: 'https://ondiem.github.io/library/',
            },
          ]"
        >
          <div></div>
        </ProjectComponent>
      </div>
      <div v-if="projectView == 'school'">
        <ProjectComponent
          title="Itch Programming for Kids!"
          description="Itch is a programming website aimed to help children transition from block coding like scratch to coding with languages like python and VB. My team and I had 24 hours to complete this website as part of a hackathon. We created our website using Vue, HTML, CSS, Javascript, and netlify. We are very happy with our accomplishments and we were even awarded third place."
          image="https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png"
          :images="[
            'https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png',
            'https://i.ibb.co/PQGMGZv/image.png',
            'https://i.ibb.co/YTL8WB3/image.png',
          ]"
          :links="[
            { name: 'GitHub Repo', url: 'https://github.com/Sjskyler27/itch/' },
            { name: 'Live Demo', url: 'https://itch.netlify.app/code' },
            {
              name: 'YouTube Demonstration',
              url: 'https://youtu.be/FZvFJNQyTms',
            },
            { name: 'Hackathon Competition', url: 'https://example.com' },
          ]"
        >
          <div></div>
        </ProjectComponent>
        <ProjectComponent
          title="Stonecrest Rentals"
          description="I had the opportunity to work as a contractor for Stonecrest Rentals as a solo full stack developer. They had recently acquired another office building and had extra rooms that they were renting out to businesses. This was all being done through 
          word of mouth. I worked closely with the company using Figma to create designs for the user and admin experience. We discussed the benefits of using a relational database for there needs, I created the schema in Dbdiagram and showed them how the relations could map to each other. Using Node, Sequelize, and Swagger I set up the skeleton for the backend and connected it to Render. I then got to work setting up the frontend using Vue and hosting it on Netlify. I worked between the two creating my components and controllers, presenting my progress to the company weekly using Jira to create sprints and tickets for myself. One of my goals for the project was to make something that the company could Easily maintain themselves, so I created the admin page that allows them to create edit and delete: rooms, new locations, amenities, etc. They are also able to easily edit the landing pages pricing info and text. they can even edit the website Title, logo and color scheme due to the use of SCSS."
          :images="[
            'https://i.ibb.co/7zZ23JW/image.png',
            'https://i.ibb.co/Cm5Dm9t/image.png',
            'https://i.ibb.co/6BBSyMC/image.png',
            'https://i.ibb.co/bvNBrJk/image.png',
          ]"
          :links="[
            {
              name: 'GitHub Repo',
              url: 'https://github.com/Sjskyler27/stonecrest-suites/',
            },
            { name: 'Live Demo', url: 'https://stoncrestsuites.netlify.app/' },
            {
              name: 'Loom Demonstration',
              url: 'https://www.loom.com/share/aba5b1c96d82414f93353d9c5e6bd76e',
            },
          ]"
        ></ProjectComponent>
        <ProjectComponent
          title="Bot Predictions for HEAT "
          description="This was a fun use of both Python and Excel; Excel is already a powerful tool 
          on its own that I enjoy using however, when you combine it 
          with openpyxl you can do just about anything. I found myself enjoying the board game HEAT very much, 
          and wanted to get more maps for it. It was difficult to choose from the 30 different maps since they had no difficulty or time stats. So I took it upon
          myself to determine these stats using the bot mechanics. In this game you can race against bots that have a specific logic for getting around the track based upon a deck of ten cards and some special
          map indicators. Games were often close between the bots and the players so I knew that this would be a good indicator of the time stat. I created a python script that
          had a bot class and a race function. The bot had functions such as getMapValues, draw card, move, and corner. The race function
          would load the race track from the excel spreadsheet that had values such as distance from corners, distance from start, corner speed, etc.
          Using this Python program I was able to run hundreds of simulations for every track and log a large amount of data. Time was easy to figure out 
          since we could just multiply the amount of average turns it took a bot to finish the race by the average time our group of players took to complete
          a turn. Difficulty was a little harder to determine. As I looked at the data I found a trend in what we considered the more dificult maps.
          In those maps the bots had a corner rate higher than .5. a corner rate of .5 would mean that every other turn the car would pass a corner, i.e. turn 1 move 10 spaces
          to the corner, turn 2 move 3 spaces past the corner. If your corner rate is higher than .5 sometimes you are passing a corner quickly. This
          is easier for bots since they don't have to pay the penalty that players have to pay. Using this knowlage I was able to create a table that represented 
          each tracks difficulty and time. I posted my findings on the forum and to my delight the times were accurate to within 2 or 3 minutes of my predictions.
          And although the dificulty is harder to precisely measure I found that new players had a much harder time keeping up on maps that were marked with a higher
          difficulty."
          :images="[
            'https://cf.geekdo-images.com/-vOrd4bOspibyohYExLqWg__imagepage/img/k4uPIqjYuWBzofFiCyjSWN6KJow=/fit-in/900x600/filters:no_upscale():strip_icc()/pic6940449.png',
            'https://cf.geekdo-images.com/GpyIgLpb_eSOsC9Y05nmyw__imagepage/img/enHJ780fj7F8GZsNLtzUylEdhVQ=/fit-in/900x600/filters:no_upscale():strip_icc()/pic7427299.png',
            'https://cf.geekdo-images.com/S1KkjFX5vodPEcF94wGtHQ__imagepage/img/VWH3CKPqRsoHDQ1v76A5VGMMI_o=/fit-in/900x600/filters:no_upscale():strip_icc()/pic7427298.png',
          ]"
          :links="[
            {
              name: 'Github Repo',
              url: 'https://github.com/Sjskyler27/HEATMAPTEST',
            },
            {
              name: 'Forum Post',
              url: 'https://boardgamegeek.com/thread/3055787/article/42258347#42258347',
            },
          ]"
        ></ProjectComponent>
        <ProjectComponent
          title="Plums!"
          description="Plums is a personal learning management system. It is a full stack website that allows a user to store information that they have acquired in a localized place, wether that be youtube videos on calculus or articles on geometry. This website was made using React, Tailwind, mongoDB, and netlify."
          :images="[
            'https://i.ibb.co/7Nz9N0m/image.png',
            'https://i.ibb.co/0Yvcxcy/image.png',
            'https://i.ibb.co/QmzMPQz/image.png',
            'https://i.ibb.co/5Rt4xLS/image.png',
          ]"
          :links="[
            {
              name: 'GitHub Repo',
              url: 'https://github.com/Sjskyler27/plums/',
            },
            { name: 'Live Demo', url: 'https://plms.netlify.app/' },
            {
              name: 'YouTube Demonstration',
              url: 'https://www.youtube.com/watch?v=fRTuhJUNvOc',
            },
          ]"
        ></ProjectComponent>
        <ProjectComponent
          title="CodeNames"
          description="This Website is a recreation of the popular board game Code Names and its variant Code Names Duet. Code Names is a game were two teams are trying to guess all of their words before the other. Two code masters will look at their solution to give hints to their team. This full stack project had a lot of fun javascript problems that I enjoyed solving when it came to generating all of the solutions for the teams particularly in the duet version."
          :images="[
            'https://i.ibb.co/xhF5CxB/image.png',
            'https://i.ibb.co/JjjNSGp/image.png',
            'https://i.ibb.co/kKSWSnv/image.png',
          ]"
          :links="[
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
          ]"
        ></ProjectComponent>
        <!-- <ProjectComponent
          title="Holidea Board Games"
          description="I had the opportunity to participate in a hackothon where we had to reach out to companies around us to find a problem to solve in 24 hours. we reached out to our local board game store to see what they might need and learned that they had no way of signing members in for there board game competitions and for renting games. so in 24 hours using django and python we created a fullstack application that they could use to keep track of there users, It included a picture a passcode and a member rank. members were then able to quickly sign in when they arrived and could proceed to enjoy there games.  "
          :images="['']"
          :links="[
            { name: 'GitHub Repo', url: 'https://github.com/Sjskyler27/itch/' },
            { name: 'Live Demo', url: 'https://itch.netlify.app/code' },
            {
              name: 'YouTube Demonstration',
              url: 'https://youtu.be/FZvFJNQyTms',
            },
          ]"
        ></ProjectComponent> -->
      </div>
    </div>
  </div>
</template>

<script>
import AboutMe2 from './components/AboutMe2.vue'; // Import AboutMe

export default {
  components: {
    AboutMe2, // Register AboutMe as a child component
  },
  data() {
    return {
      projectView: 'about',
    };
  },
  mounted() {
    // Scroll to the top of the page when the component is mounted
    window.scrollTo(0, 0);
    this.bootCodenames();
    this.bootStoneCrest();
  },
  methods: {
    async bootStoneCrest() {
      try {
        // eslint-disable-next-line no-unused-vars
        const response = await fetch(
          'https://stonecrast-api.onrender.com/api',
          {
            method: 'GET',
          }
        )
          .then(response => {
            if (response.ok) {
              return response.json();
            }
          })
          .then(data => {
            console.log(data);
          });
      } catch (error) {
        console.error('Error fetching stonecrest data:', error);
      }
    },
    async bootCodenames() {
      try {
        // eslint-disable-next-line no-unused-vars
        const response = await fetch(
          'https://codenamesdb.onrender.com/getAllCodes',
          {
            method: 'GET',
          }
        )
          .then(response => {
            if (response.ok) {
              return response.json();
            }
          })
          .then(data => {
            console.log(data);
          });
      } catch (error) {
        console.error('Error fetching Codenames data:', error);
      }
    },
  },
};
</script>

<style lang="scss">
h1 {
  color: #003d5b;
  font-family: Century Gothic;
  font-weight: 200;
  font-size: 40px;
  margin: 8px;
}
.menu {
  width: 80%;
  display: flex;
  justify-content: space-between;

  h1 {
    font-size: 30px;
    cursor: pointer;
  }
}
#centered-container {
  display: flex;
  flex-direction: column; /* Stack items vertically */
  align-items: center; /* Center items horizontally */
  justify-content: center; /* Center items vertically */
}

::-webkit-scrollbar {
  width: 8px; /* Set the scrollbar width */
  height: 8px; /* Set the scrollbar height */
}

::-webkit-scrollbar-thumb {
  background-color: #5a7c8e; /* Set the thumb color */
  border-radius: 4px; /* Round the thumb edges */
}

::-webkit-scrollbar-track {
  background-color: #e5e5e5; /* Set the track color */
  border-radius: 4px; /* Round the track edges */
}
@media screen and (max-width: 650px) {
  h1 {
    font-size: 26px;
  }
}
</style>
