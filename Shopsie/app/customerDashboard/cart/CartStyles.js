import { StyleSheet, Platform, StatusBar } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingHorizontal: 12,
    backgroundColor: "#f4f4f4",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 12,
    color: "#2e4466",
  },
  cartItem: {
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  itemName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  itemQty: {
    fontSize: 14,
    color: "#555",
  },
  itemSpec: {
    fontSize: 14,
    color: "#777",
  },
  confirmBtn: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  input: {
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 6,
  marginVertical: 4,
  backgroundColor: "#fff",
},
});