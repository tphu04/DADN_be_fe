/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    fontFamily: {
      // sans: ["ui-sans-serif", "system-ui"],
      // primary: "Prompt",
      // secondary: "Proza Libre",
      // tertiary: "Protest Riot",

      poppins: "Poppins",
      quicksand: "Quicksand",
      roboto: "Roboto",
    },
    container: {
      padding: {
        DEFAULT: "15px",
      },
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "960px",
      xl: "1140px",
    },
    extend: {
      colors: {
        primary: "#0a0a0a",
        accent: {
          DEFAULT: "#a37d4c",
          hover: "#967142",
        },
      },
      backgroundImage: {
        room: "url('./assets/img/room.jpg')",
      },
    },
  },
  plugins: [],
};
