import { StyleSheet } from "react-native";

export default StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#3f5375",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },

  header: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    fontSize: 40,
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },

  form: {
    alignItems: "center",
  },

  formCard: {
    width: "100%",
    backgroundColor: "#dfe5ef",
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
  },

  input: {
    backgroundColor: "#e6e6e6",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
  },

  button: {
    width: "100%",
    backgroundColor: "#FFD60A",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },

  buttonText: {
    fontWeight: "700",
    color: "#0a0c47",
  },

  link: {
    color: "#fff",
    fontSize: 14,
  },

  linkBold: {
    color: "#a8f0e6",
    fontWeight: "700",
  },
  roleCard: {
  width: "100%",
  backgroundColor: "#dfe5ef",
  padding: 18,
  borderRadius: 15,
  marginBottom: 18,
  flexDirection: "row",
  alignItems: "center",
},

roleCard: {
  width: "100%",
  backgroundColor: "#dfe5ef",
  padding: 18,
  borderRadius: 15,
  marginBottom: 18,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

roleCardSelected: {
  backgroundColor: "#ffffff",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 3,
},

roleLeft: {
  flexDirection: "row",
  alignItems: "center",
},

roleIcon: {
  fontSize: 20,
  marginRight: 15,
},

roleText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#1a1a1a",
},

radioOuter: {
  width: 22,
  height: 22,
  borderRadius: 11,
  borderWidth: 2,
  borderColor: "#ccc",
  justifyContent: "center",
  alignItems: "center",
},

radioOuterSelected: {
  borderColor: "#FFD60A",
},

radioInner: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#FFD60A",
},
roleIcon: {
  fontSize: 20,
  marginRight: 15,
},

roleText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#1a1a1a",
},

uploadButton: {
  width: "100%",
  backgroundColor: "#e6e6e6",
  padding: 14,
  borderRadius: 10,
  marginBottom: 15,
  alignItems: "center",
},

uploadText: {
  color: "#333",
  fontWeight: "500",
},

riderNote: {
  color: "#ff4d4d",   // 🔴 THIS makes text red
  fontSize: 12,
  marginTop: 5,
  textAlign: "center",
},

riderButton: {
  backgroundColor: "#FFD60A",
},

riderForm: {
  backgroundColor: "#dfe5ef",
},
riderHeader: {
  marginBottom: 25,
},

riderTitle: {
  color: "#fff",
}
});