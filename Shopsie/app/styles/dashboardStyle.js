import { StyleSheet } from "react-native";

export default StyleSheet.create({

  /* -------------------- CONTAINER -------------------- */
  container: {
    flex: 1,
    backgroundColor: "#ffffffff",
  },

/* -------------------- HEADER -------------------- */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    padding: 20,
  },

  logo: {
    fontSize: 22,
    fontWeight: "600",
    fontStyle: "italic",
    letterSpacing: 1.5,
    color: "#ffffff",
    fontFamily: "sans-serif-light",
  },

  icons: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,                  // Adds clean, uniform spacing between your header icons
  },

  iconSpacing: {
    marginLeft: 4,            // Small fallback padding if needed
  },

  /* -------------------- PROFILE CARD -------------------- */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffffff",
    padding: 20,
    borderRadius: 18,
    margin: 26,
    marginBottom: 60,
    shadowColor: "#000",
    shadowOpacity: 0.40,
    shadowRadius: 6,
    elevation: 5,
    paddingHorizontal: 16,
  },

  profileImage: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 30,
  },

  username: {
    fontSize: 18,
    fontWeight: "700",
    color: "black",
  },

/* -------------------- TASK CARD -------------------- */
taskCard: {
  flexDirection: "row",
  alignItems: "center",
  padding: 20,
  margin: 26,
  marginBottom: 60,
  backgroundColor: "#ffffff",
  borderRadius: 18,
  shadowColor: "#000",
  shadowOpacity: 0.40,
  shadowRadius: 6,
  elevation: 5,
  paddingHorizontal: 16,
},

taskTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "black",
  marginLeft: 30,
},

  /* -------------------- GRID CARDS -------------------- */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 100,
    paddingHorizontal: 26,
  },

  card: {
    backgroundColor: "#2e4466",
    width: "48%",
    height: 135,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  cardText: {
    color: "#ffffffff",
    marginTop: 8,
    fontWeight: "600",
    fontSize: 14,
  },


//   /* -------------------- BOTTOM NAVIGATION -------------------- */
 bottomNav: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,

  height: 75,

  backgroundColor: "#2e4466",
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",

  elevation: 0,
  borderTopWidth: 0,
  zIndex: 1000,
},

 tabItem: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
},
  navText: {
    color: "white",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    fontWeight: 500,
  },

});