<template>
  <div id="app">
    <div id="centered-container">
      <h1>Skyler Simpsons Portfolio</h1>
      <AboutMe></AboutMe>
      <h1>My Projects</h1>
      <ProjectComponent
        title="Itch Programming for Kids!"
        description="Itch is a programming website aimed to help children transition from block coding like scratch to coding with languages like python and VB. Me and my team had 24 hours to complete this website as part of a BYUI hackathon. We created our website using Vue, HTML, CSS, Javascript, and netlify. We are very happy with our accomplishments and we were even awarded third place."
        image="https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png"
        :images="[
          'https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/002/629/889/datas/medium.png',
          'https://i.ibb.co/PQGMGZv/image.png',
          'https://i.ibb.co/YTL8WB3/image.png',
        ]"
        :links="[
          { name: 'GitHub Repo', url: 'https://github.com/Sjskyler27/itch/' },
          { name: 'Live Demo', url: 'https://itch.netlify.app/code' },
          { name: 'Devpost submission', url: 'https://example.com' },
          {
            name: 'YouTube Demonstration',
            url: 'https://youtu.be/FZvFJNQyTms',
          },
        ]"
      ></ProjectComponent>
      <ProjectComponent
        title="StoneCrest Suites"
        description="I had the opportunity to work as a contractor for stonecrest suites as a solo full stack developer. They had recently acquired another office building for there lawfirm and had extra rooms that they were renting out to businesses. This was all being done through 
        word of mouth. I was able to step in and create a website for them that allowed users to create an account and reserve conference and office rooms. The website that I created is scaleable allowing admins to add locations, rooms, edit reservations etc. They are also able to edit the appearance of their website along with any pertinent information"
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
            name: 'YouTube Demonstration',
            url: 'https://youtu.be/FZvFJNQyTms',
          },
        ]"
      ></ProjectComponent>
      <ProjectComponent
        title="Plums!"
        description="Plums is a personal learning managmeant system, or PLMS for short. It is a full stack website that allows a user to store information that they have acquired in a localized place, wether that be youtube videos on calculus or articles on geometry. This website was made using React, Tailwind, mongoDB, and netlify."
        :images="[
          'https://i.ibb.co/7Nz9N0m/image.png',
          'https://i.ibb.co/0Yvcxcy/image.png',
          'https://i.ibb.co/QmzMPQz/image.png',
          'https://i.ibb.co/5Rt4xLS/image.png',
        ]"
        :links="[
          { name: 'GitHub Repo', url: 'https://github.com/Sjskyler27/plums/' },
          { name: 'Live Demo', url: 'https://plms.netlify.app/' },
          {
            name: 'YouTube Demonstration',
            url: 'https://youtu.be/FZvFJNQyTms',
          },
        ]"
      ></ProjectComponent>
      <ProjectComponent
        title="CodeNames"
        description="This Website is a recreation of the popular board game Code Names and its varient Code Names Duet. Code Names is a game were two teams are trying to guess all of there words before the other. Two code masters will look at there solution to give hints to there team. This full stack project had a lot of fun javascript problems that I enjoyed solving when it came to generateing all of the solutions for the teams particularly in the duet version."
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
          { name: 'Live Demo', url: 'https://codenamesbyskyler.netlify.app/' },
          {
            name: 'YouTube Demonstration',
            url: 'https://youtu.be/FZvFJNQyTms',
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
      <div>
        <a
          href="@/assets/skylersimpson.pdf"
          download="skylersimpson.pdf"
          class="download-button"
        >
          Download My Resume
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import AboutMe from './components/AboutMe.vue'; // Import AboutMe

export default {
  components: {
    AboutMe, // Register AboutMe as a child component
  },
  // Other properties and methods of your parent component
};
</script>

<style lang="scss">
#centered-container {
  display: flex;
  flex-direction: column; /* Stack items vertically */
  align-items: center; /* Center items horizontally */
  justify-content: center; /* Center items vertically */
}

.download-button {
  display: inline-block;
  padding: 10px 20px;
  background-color: #0074d9; /* Adjust the background color */
  color: #fff; /* Adjust the text color */
  text-decoration: none;
  border-radius: 5px;
  font-size: 16px;
}

.download-button:hover {
  background-color: #0056b3; /* Adjust the hover background color */
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
@media screen and (max-width: 480px) {
  h1 {
    font-size: 26px;
  }
}
</style>
