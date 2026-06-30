import { StyleSheet, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default StyleSheet.create({
  /* ---------------- ROOT ---------------- */
  scrollContainer: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    paddingHorizontal: 26,
  },

  screenScroll: {
    flex: 1,
  },

  screenContent: {
    paddingTop: 2,
    paddingBottom: 75,
  },

  /* ---------------- HEADER ---------------- */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: -26,
    marginBottom: 48,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  linkedHeader: {
    height: 85,
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 0,
  },

  pageHeaderTitle: {
    flex: 1,
    color: "#2e4466",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  headerSide: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
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
    paddingLeft: 10,
  },

  iconButton: {
    marginLeft: 14,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
  },

  headerSub: {
    fontSize: 14,
    color: "#dbe6f3",
    marginTop: 4,
    fontWeight: "600",
  },

  notificationBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },

  /* ---------------- TITLES ---------------- */
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2e4466",
    marginTop: 2,
    marginBottom: 20,
  },

  /* ---------------- DASHBOARD BOXES ---------------- */
  dashboardWrapper: {
    marginBottom: 110,
  },
  boxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
  },
  box: {
    flex: 1,
    minHeight: 135,
    backgroundColor: "#2e4466",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },

  boxText: {
    color: "#ffffff",
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  wideBox: {
    minHeight: 30,
    backgroundColor: "#cdfce6",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  wideBoxText: {
    color: "#2e4466",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },

  /* ---------------- BACK BUTTON ---------------- */
  backText: {
    fontSize: 16,
    color: "#0a0c47",
    fontWeight: "600",
    marginBottom: 10,
  },

  /* ---------------- INPUTS ---------------- */
  input: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginBottom: 14,
    fontSize: 16,
    color: "#1e293b",
    backgroundColor: "#ffffff",
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },

  primaryBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#f06543",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 9,
    elevation: 4,
    backgroundColor: "#16A34A",
  },

  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },

  /* ---------------- CARDS ---------------- */
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#dbe5f1",
    shadowColor: "#2e4466",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },

  userCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dce7f3",
    shadowColor: "#2e4466",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },

  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#c2ccdb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  userAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: "#c2ccdb",
    borderWidth: 2,
    borderColor: "#eef4fe",
  },

  userAvatarText: {
    color: "#2e4466",
    fontSize: 17,
    fontWeight: "500",
  },

  userNameText: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },

  userMetaText: {
    color: "#7c8aa0",
    fontSize: 12,
    fontWeight: "500",
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },

  cardSubText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },

  roleBadge: {
    width: 110,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    borderRadius: 999,
    paddingVertical: 6,
    borderWidth: 1,
    fontWeight: "600",
    textTransform: "uppercase",
    overflow: "hidden",
  },
  roleBadgeAdmin: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    borderColor: "#FCA5A5",
  },

  roleBadgeShopkeeper: {
    backgroundColor: "#FFEDD5",
    color: "#C2410C",
    borderColor: "#FDBA74",
  },

  roleBadgeRider: {
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    borderColor: "#93C5FD",
  },

  roleBadgeCustomer: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    borderColor: "#86EFAC",
  },

  /* ---------------- DROPDOWN FILTER ---------------- */
  dropdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#eef4fe",
    borderRadius: 18,
    padding: 6,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#d4e0ef",
  },

  dropdownItem: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    margin: 2,
  },

  dropdownItemActive: {
    backgroundColor: "#f06543",
    shadowColor: "#f06543",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  dropdownText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2e4466",
  },

  dropdownTextActive: {
    color: "#ffffff",
  },

  /* ---------------- RIDER ACTIONS / ADMIN TABLE BUTTON ---------------- */
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  approveBtn: {
    flex: 0.48,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  rejectBtn: {
    flex: 0.48,
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  // Added layout definition to handle the admin dashboard removal trigger buttons without stretching
  removeAdminBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    width: 140,
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  /* ---------------- STATS ---------------- */
  statBox: {
    backgroundColor: "#2e4466",
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#415d86",
    shadowColor: "#2e4466",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },

  statLabel: {
    color: "#dbe6f3",
    fontSize: 14,
    fontWeight: "700",
  },
  statValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8,
  },

  /* ---------------- REPORTS ---------------- */
  reportCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f7c9c1",
    shadowColor: "#b91c1c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },

  reportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  reportTitleBadge: {
    color: "#ffffff",
    backgroundColor: "#f06543",
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "500",
  },

  reportMeta: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 4,
  },

  suspendBtn: {
    backgroundColor: "#b91c1c",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
    shadowColor: "#b91c1c",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    elevation: 4,
  },

  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  warningSuspendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
  },

  warningSuspendText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  messageText: {
    color: "#0f766e",
    backgroundColor: "#d1fae5",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },

  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 34,
    fontWeight: "500",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
  },

  closeCornerBtn: {
    position: "absolute",
    top: 15,
    right: 20,
    zIndex: 10,
    padding: 5,
  },

  confirmModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginTop: 10,
    textAlign: "center",
  },

  modalSubtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 10,
    marginBottom: 25,
    textAlign: "center",
    lineHeight: 22,
  },

  shareButtonsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },

  cancelModalBtn: {
    flex: 1,
    backgroundColor: "#CBD5E1",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  dangerModalBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  cancelModalText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
  },

  dangerModalText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  successModalBtn: {
    flex: 1,
    backgroundColor: "#16A34A",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16A34A",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  /* ---------------- PROFILE CARD ---------------- */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 18,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOpacity: 0.4,
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

  /* ---------------- BOTTOM NAV ---------------- */

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },

  navText: {
    color: "white",
    fontSize: 12,
    marginTop: 0,
    textAlign: "center",
    fontWeight: "500",
  },
  /* ===== Document Row ===== */
  docRow: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "flex-start",
    gap: 10,
  },

  /* ===== Small Document Image ===== */
  docImg: {
    width: 110,
    height: 110,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
  },

  /* ===== Modal Container ===== */
  modalContainer: {
    flex: 1,
    backgroundColor: "black",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    alignItems: "center",
  },

  modalCounter: {
    color: "#fff",
    fontSize: 16,
  },

  imageHeader: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  imageCounter: {
    color: "#fff",
    fontWeight: "900",
  },

  warningBox: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#e67e22",
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 9999,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  warningText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },

  /* ===== Full Screen Image ===== */
  fullImage: {
    width: SCREEN_WIDTH,
    height: "80%",
  },

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
});
