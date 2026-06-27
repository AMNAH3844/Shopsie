
import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: { flex: 1, padding: 20 },

  // Common
  title: { fontSize: 22, marginBottom: 20, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#2e4466",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
  },
  buttonText: { color: "white", fontWeight: "bold", textAlign: "center" },

  // UpdateStock & SetThreshold Cards
  card: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },

  cardInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginVertical: 5,
    borderRadius: 5,
  },
  cardButton: {
    backgroundColor: "#2e4466",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 5,
  },
  cardButtonText: { color: "white", fontWeight: "bold" },

  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  searchInput: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 8,
  },
  tableHeader: {
  flexDirection: "row",
  backgroundColor: "#2e4466",
  paddingVertical: 12,
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
},

tableRow: {
  flexDirection: "row",
  paddingVertical: 12,
  backgroundColor: "white",
  borderBottomWidth: 1,
  borderColor: "#eee",
  alignItems: "center",
},

cell: {
  flex: 1,
  textAlign: "center",
  fontSize: 13,
},

headerCell: {
  flex: 1,
  textAlign: "center",
  color: "white",
  fontWeight: "bold",
  fontSize: 13,
},

lowStockRow: {
  backgroundColor: "#ffe5e5",  // light red
},
searchInput: {
  backgroundColor: "#fff",
  padding: 12,
  borderRadius: 10,
  marginBottom: 15,
  elevation: 2,
},

buttonRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 10,
},

deleteButton: {
  backgroundColor: "#af2828",
  padding: 12,
  borderRadius: 10,
  flex: 0.48,
  alignItems: "center",
},

deleteButtonText: {
  color: "#fff",
  fontWeight: "600",
},
});