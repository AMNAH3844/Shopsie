import { StyleSheet, Platform, StatusBar } from "react-native";

export default StyleSheet.create({
  /* -------------------- CONTAINER -------------------- */
  container: { 
    flex: 1, 
    backgroundColor: "#f4f4f4", 
  },

  /* -------------------- HEADER -------------------- */
  
    header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 85,
    marginBottom: 20,
  },
  headerSpacer: { width: 40 },
  headerTitleText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2e4466",
    textAlign: "center",
    flex: 1,
  },
  headerIcons: { width: 40, alignItems: "flex-end" },


  /* -------------------- INPUTS -------------------- */
  input: { 
    backgroundColor: "#fff", 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: "#ccc", 
    marginHorizontal: 20 
  },
  row: { 
    flexDirection: "row", 
    gap: 10, 
    marginBottom: 10, 
    paddingHorizontal: 20 
  },

  /* -------------------- BUTTONS -------------------- */
  dbBtn: { 
    backgroundColor: "#4a6fa5", 
    padding: 10, 
    borderRadius: 20, 
    flex: 1, 
    alignItems: "center" 
  },
  favBtn: { 
    backgroundColor: "#d45a3a", 
    padding: 10, 
    borderRadius: 20, 
    flex: 1, 
    alignItems: "center" 
  },
  addBtn: { 
    backgroundColor: "#4a6fa5", 
    padding: 12, 
    borderRadius: 20, 
    alignItems: "center", 
    marginHorizontal: 20, 
    marginBottom: 10 
  },
  saveBtn: { 
    backgroundColor: "#4CAF50", 
    padding: 12, 
    borderRadius: 20, 
    alignItems: "center", 
    flex: 1, 
    marginRight: 5 
  },
  finalizeBtn: { 
    backgroundColor: "#6c8ebf", 
    padding: 12, 
    borderRadius: 20, 
    alignItems: "center", 
    flex: 1, 
    marginLeft: 5 
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold" 
  },

  /* -------------------- LIST ITEMS -------------------- */
  listItem: { 
    flexDirection: "row", 
    justifyContent: "flex-start", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    padding: 10, 
    borderRadius: 8, 
    marginVertical: 2, 
    marginHorizontal: 0 
  },
  itemText: { 
    fontSize: 16, 
    fontWeight: "500" 
  },
  removeBtn: { 
    color: "#2e4466", 
    fontWeight: "bold", 
    fontSize: 16, 
    marginLeft: 8 
  },
  listRowActions: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "flex-end", 
    gap: 8,
    marginLeft: 5 
  },

  /* -------------------- PANELS (UPDATED FIX) -------------------- */
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "45%",          
    height: "100%",
    backgroundColor: "#e9edf3",
    paddingVertical: 10,
    paddingHorizontal: 10,
    zIndex: 9999,       
    elevation: 20,       
    borderLeftWidth: 1,
    borderLeftColor: "#cfd6e0",
  },

  panelScroll: {
    flexGrow: 1,
  },

  panelCloseBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#2e4466",
    padding: 6,
    borderRadius: 6,
    marginBottom: 10,
  },

  panelCloseText: {
    fontWeight: "bold",
    color: "white",
    fontSize: 16,
  },

  /* -------------------- CATEGORIES -------------------- */
  categoryTitle: {
    backgroundColor: "#eef4fe",
    color: "rgba(46, 68, 102, 1.00)",
    padding: 10,
    borderRadius: 8,
    fontWeight: "bold",
    fontSize: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  categoryItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 42,
  },

  categoryItemBtn: { flex: 1 },
  categoryItemActions: { flexDirection: "row", gap: 8 },

categoryItemsContainer: {
  backgroundColor: "transparent", 
 },

/* -------------------- FAVORITES -------------------- */
  favPanelTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2e4466",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
  },

  favItemRow: { 
    marginBottom: 6, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  favItemText: {
    flex: 1,
    fontSize: 14,
  },

  favCategory: { 
    fontWeight: "600", 
    backgroundColor: "#28a745", 
    color: "white", 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 10, 
    alignSelf: "flex-start", 
    marginBottom: 2,
    fontSize: 12,
  },

  /* -------------------- FINAL LIST -------------------- */
  finalPanelContainer: {
    flex: 1,
    backgroundColor: "#f0f2f7",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },

  finalPanelCategory: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2e4466",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
  },

  finalPanelItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
    elevation: 1,
  },

  finalPanelItemName: {
    fontSize: 14,
    color: "#333",
  },

  finalPanelItemQty: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2e4466",
  },

//   /* -------------------- AUTOCOMPLETE -------------------- */
  recommendationContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#d1d8e4",
    borderWidth: 1,
    borderColor: "#ccc",
    overflow: 'hidden',
  },

  suggestionList: {
    maxHeight: 180, 
  },

  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    backgroundColor: "#d1d8e4",
  },

  suggestionText: {
    fontSize: 15,
    color: "#2e4466",
  },

 /* -------------------- CONTAINER & FOOTER -------------------- */
container: { 
  flex: 1, 
  backgroundColor: "#f4f4f4",
},

footerContainer: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 15,

  flexDirection: "row",
  paddingHorizontal: 15,
  paddingVertical: 14,

  backgroundColor: "#2e4466",

  zIndex: 1000,
  elevation: 10,
},

/* -------------------- LIST ITEMS (FIXED OVERFLOW) -------------------- */
listItem: { 
  flexDirection: "row", 
  alignItems: "center", 
  backgroundColor: "#fff", 
  padding: 12, 
  borderRadius: 8, 
  marginVertical: 4, 
  marginHorizontal: 15,
  elevation: 1,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
},

itemInfo: {
  flex: 1,
  marginRight: 10,
},

itemText: { 
  fontSize: 15, 
  fontWeight: "bold",
  color: "#333",
  flexWrap: 'wrap', 
},

itemCategory: {
  fontSize: 12,
  color: "#666",
  fontStyle: 'italic',
},

itemInputs: {
  flexDirection: "row",
  gap: 5,
  alignItems: "center",
},

inputSmall: { 
  backgroundColor: "#f9f9f9", 
  padding: 6, 
  borderRadius: 6, 
  borderWidth: 1, 
  borderColor: "#ddd", 
  width: 55, 
  textAlign: "center",
  fontSize: 13,
},

/* -------------------- SECTION TITLE -------------------- */
sectionHeader: {
  fontSize: 18,
  fontWeight: "700",
  color: "#2e4466",
  marginTop: 25,
  marginBottom: 12,
  marginHorizontal: 20,
  letterSpacing: 0.5,
  borderLeftWidth: 5,
  borderLeftColor: "#4CAF50", 
  paddingLeft: 10,
}, 

modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 15,
    paddingBottom: 25,
    paddingHorizontal: 30,
    alignItems: "center",
    position: 'relative',
  },
  closeCornerBtn: {
    position: 'absolute',
    top: 15,
    right: 20,
    zIndex: 10,
    padding: 5,
  },
  closeX: {
    fontSize: 22,
    color: "#94a3b8",
    fontWeight: "bold"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginTop: 18,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 12,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20
  },
  shareButtonsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  friendBtn: {
    flex: 1,
    backgroundColor: "#e5e5e5",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginRight: 8,
  },
  riderBtn: {
    flex: 1,
    backgroundColor: "#314a73",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginLeft: 8,
  },
  friendBtnText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 15,
  },
  riderBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  warningBox: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#e67e22',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  warningText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },

})

