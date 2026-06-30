import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, Image, TextInput, 
    TouchableOpacity, ActivityIndicator, StatusBar, Modal 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URLS } from '../../../src/services/apiConfig';

const API_URL = API_URLS.FRIENDS;

const FriendsScreen = () => {
    const router = useRouter();
    const { items, listName } = useLocalSearchParams();

    // --- State Management ---
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [showAddSection, setShowAddSection] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    
    // Modals State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState({ id: null, name: '' });
    
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [friendToShareWith, setFriendToShareWith] = useState({ id: null, name: '' });
    
    // Warning Toast States
    const [showNoListBox, setShowNoListBox] = useState(false);
    const [toastMessage, setToastMessage] = useState('Please select a list to share first');

    const [listFilter, setListFilter] = useState('');

    // --- Helper for handling notifications using the custom warning Box ---
    const triggerWarning = (message) => {
        setToastMessage(message);
        setShowNoListBox(true);
        setTimeout(() => {
            setShowNoListBox(false);
        }, 2500);
    };

    // --- 1. Get User ID on Mount ---
    useEffect(() => {
        const getUserId = async () => {
            try {
                const user = await AsyncStorage.getItem('userData'); 
                if (user) {
                    const parsedUser = JSON.parse(user);
                    setCurrentUserId(Number(parsedUser.id));
                }
            } catch (e) {
                console.error("AsyncStorage Error:", e);
            }
        };
        getUserId();
    }, []);

    // --- 2. Fetch/Search Friends Logic ---
    useEffect(() => { 
        if (currentUserId) fetchFriends(); 
    }, [currentUserId]);

    const fetchFriends = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/${currentUserId}`);
            setFriends(res.data);
        } catch (e) { 
            console.error("Fetch Error:", e.message); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => {
        const delay = setTimeout(() => {
            if (searchQuery.trim().length >= 2 && currentUserId !== null) {
                performSearch();
            } else {
                setSearchResults([]);
            }
        }, 400);
        return () => clearTimeout(delay);
    }, [searchQuery, currentUserId]);

    const performSearch = async () => {
        setIsSearching(true);
        try {
            const cleanQuery = searchQuery.trim().toLowerCase();
            const res = await axios.get(`${API_URL}/search?query=${cleanQuery}&currentUserId=${currentUserId}`);
            
            const resultsWithStatus = res.data.map(user => {
                const relationship = friends.find(f => String(f.userId) === String(user.id));
                return {
                    ...user,
                    friendshipStatus: relationship ? relationship.status : null,
                };
            });
            setSearchResults(resultsWithStatus);
        } catch (e) { 
            console.error("Search Error:", e.message); 
        } finally { 
            setIsSearching(false); 
        }
    };

    // --- 3. Friendship Actions ---
    const addFriend = async (friendId) => {
        try {
            await axios.post(`${API_URL}/add`, { userId: currentUserId, friendId });
            triggerWarning("Friend request sent!");
            setSearchQuery('');
            fetchFriends();
        } catch (e) { 
            triggerWarning("Request already exists"); 
        }
    };

    const acceptFriend = async (friendshipId) => {
        try {
            await axios.post(`${API_URL}/accept`, { friendshipId });
            triggerWarning("Friend request accepted!");
            fetchFriends(); 
        } catch (e) { 
            triggerWarning("Could not accept request"); 
        }
    };

    const removeFriend = async (friendshipId) => {
        try {
            await axios.post(`${API_URL}/delete`, { friendshipId });
            triggerWarning("Friend removed successfully");
            fetchFriends(); 
        } catch (e) { 
            triggerWarning("Could not remove friend"); 
        }
    };

    // --- 4. SHARE LIST LOGIC ---
    const confirmShare = (id, name) => {
        if (!items || items === "[]" || items === "null") {
            triggerWarning("Please select a list to share first");
            return;
        }
        setFriendToShareWith({ id, name });
        setShareModalVisible(true);
    };

    const shareList = async () => {
        const friendId = friendToShareWith.id;
        const friendUsername = friendToShareWith.name;
        
        setShareModalVisible(false); 
        setSharing(true);

        try {
            const token = await AsyncStorage.getItem("token");

            if (!token) {
                triggerWarning("Please log in again.");
                setSharing(false);
                return;
            }

            const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
            await axios.post(
                `${API_URLS.INBOX}/share`,
                {
                    receiverId: Number(friendId), 
                    listName: listName || "Shared List",
                    items: parsedItems 
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            triggerWarning(`List shared with ${friendUsername}!`);
            setTimeout(() => {
                router.push("/customerDashboard/inbox"); 
            }, 1200);

        } catch (e) {
            console.error("❌ SHARE ERROR:", e.response?.data || e.message);
            triggerWarning("Failed to share list.");
        } finally {
            setSharing(false);
        }
    };

    const confirmRemove = (id, name) => {
        setSelectedFriend({ id, name });
        setModalVisible(true);
    };

    const filteredFriends = friends.filter(f => 
        f.username.toLowerCase().startsWith(listFilter.toLowerCase())
    );

    // --- Render Component ---
    const renderUserItem = ({ item, isSearchItem }) => (
        <View style={styles.friendCard}>
            <Image
                source={{
                    uri: item.profileImage || `https://ui-avatars.com/api/?name=${item.username}&background=c2ccdb&color=2e4466`
                }}
                style={styles.profilePic}
            />
            <View style={styles.infoContainer}>
                <Text style={styles.nameText}>{item.username}</Text>
                {isSearchItem && item.friendshipStatus === 'PENDING' && <Text style={styles.pendingSubText}>Pending Request</Text>}
                {isSearchItem && item.friendshipStatus === 'ACCEPTED' && <Text style={styles.statusText}>Already Friend</Text>}
                {!isSearchItem && item.status === 'PENDING' && !item.amIReceiver && <Text style={styles.pendingSubText}>Waiting for response...</Text>}
            </View>

            {isSearchItem ? (
                <View>
                    {!item.friendshipStatus ? (
                        <TouchableOpacity style={styles.addBtn} onPress={() => addFriend(item.id)}>
                            <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                    ) : (
                        <Ionicons name={item.friendshipStatus === 'ACCEPTED' ? "people" : "time-outline"} size={22} color="#999" />
                    )}
                </View>
            ) : (
                <View style={styles.actionButtons}>
                    {item.status === 'PENDING' && item.amIReceiver ? (
                        <View style={styles.row}>
                            <TouchableOpacity onPress={() => acceptFriend(item.friendshipId)}>
                                <Ionicons name="checkmark-circle" size={32} color="green" style={{ marginRight: 8 }} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeFriend(item.friendshipId)}>
                                <Ionicons name="close-circle" size={32} color="red" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.row}>
                            {item.status === 'ACCEPTED' && (
                                <TouchableOpacity 
                                    style={{ marginRight: 15 }} 
                                    onPress={() => confirmShare(item.userId, item.username)}
                                    disabled={sharing}
                                >
                                    {sharing && friendToShareWith.id === item.userId ? (
                                        <ActivityIndicator size="small" color="#24a12f" />
                                    ) : (
                                        <Ionicons name="share-social-outline" size={24} color="#24a12f" />
                                    )}
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => confirmRemove(item.friendshipId, item.username)}>
                                <Ionicons name="trash-outline" size={24} color="#d45a3a" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.container}>
            <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
               <TouchableOpacity 
                   onPress={() => router.canGoBack() ? router.back() : router.replace("/customerDashboard")}
                 >
                   <Ionicons name="chevron-back" size={28} color="#eef4fe" />
                 </TouchableOpacity>
                <Text style={styles.headerTitleText}>Friends</Text>
                <TouchableOpacity onPress={() => setShowAddSection(!showAddSection)}>
                    <MaterialCommunityIcons name={showAddSection ? "close-circle" : "account-plus"} size={32} color="#2e4466" />
                </TouchableOpacity>
            </LinearGradient>

            {showAddSection && (
                <View style={styles.addSectionContainer}>
                    <View style={styles.searchWrapper}>
                        <Ionicons name="search" size={18} color="#888" style={{marginRight: 8}} />
                        <TextInput style={styles.searchInput} placeholder="Find by username..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#999" autoFocus />
                        {isSearching && <ActivityIndicator size="small" color="#2e4466" />}
                    </View>
                    <FlatList data={searchResults} keyExtractor={(item) => "user-" + item.id} renderItem={({ item }) => renderUserItem({ item, isSearchItem: true })} style={{ maxHeight: 250 }} />
                </View>
            )}

            <View style={styles.listSearchWrapper}>
                <View style={styles.listSearchBox}>
                    <Ionicons name="filter" size={18} color="#666" />
                    <TextInput placeholder="Search my friends..." style={styles.listSearchInput} value={listFilter} onChangeText={setListFilter} />
                    {listFilter !== '' && (
                        <TouchableOpacity onPress={() => setListFilter('')}>
                            <Ionicons name="close-circle" size={18} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item.friendshipId.toString()}
                renderItem={({ item }) => renderUserItem({ item, isSearchItem: false })}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={fetchFriends}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>
                                {listFilter ? "No friends match." : "Your friend list is empty."}
                            </Text>
                        </View>
                    )
                }
            />

            {/* Redesigned Remove Friend Confirmation Modal */}
            <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeCornerBtn}>
                            <Text style={styles.closeX}>✕</Text>
                        </TouchableOpacity>

                        <Text style={[styles.modalTitle, { color: '#d45a3a' }]}>Remove Friend</Text>
                        <Text style={styles.modalSubtitle}>Are you sure you want to remove "{selectedFriend.name}" from your friend list?</Text>
                        
                        <View style={styles.shareButtonsRow}>
                            <TouchableOpacity style={[styles.friendBtn, { backgroundColor: '#e5e5e5' }]} onPress={() => setModalVisible(false)}>
                                <Text style={[styles.friendBtnText, { color: '#333' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.riderBtn, { backgroundColor: '#d45a3a' }]} onPress={() => { removeFriend(selectedFriend.id); setModalVisible(false); }}>
                                <Text style={styles.riderBtnText}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Custom Warning Box - Always Orange */}
            {showNoListBox && (
                <View style={styles.warningBox}>
                    <Ionicons name="alert-circle-outline" size={20} color="#fff" />
                    <Text style={styles.warningText}>{toastMessage}</Text>
                </View>
            )}

            {/* Redesigned Share Confirmation Modal */}
            <Modal animationType="fade" transparent visible={shareModalVisible} onRequestClose={() => setShareModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <TouchableOpacity onPress={() => setShareModalVisible(false)} style={styles.closeCornerBtn}>
                            <Text style={styles.closeX}>✕</Text>
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Share List</Text>
                        <Text style={styles.modalSubtitle}>Do you want to share your active shopping list with "{friendToShareWith.name}"?</Text>
                        
                        <View style={styles.shareButtonsRow}>
                            <TouchableOpacity style={[styles.friendBtn, { backgroundColor: '#e5e5e5' }]} onPress={() => setShareModalVisible(false)}>
                                <Text style={[styles.friendBtnText, { color: '#333' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.riderBtn, { backgroundColor: '#10b981' }]} onPress={shareList}>
                                <Text style={styles.riderBtnText}>Share</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            {/* UNIFIED DESIGN BOTTOM NAVIGATION */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/customerDashboard")}>
                    <Ionicons name="home" size={22} color="white" />
                    <Text style={styles.navText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/customerDashboard/savedlist")}>
                    <MaterialCommunityIcons name="format-list-bulleted" size={22} color="white" />
                    <Text style={styles.navText}>Saved Lists</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/customerDashboard/inbox")}>
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color="white" />
                    <Text style={styles.navText}>Inbox</Text>
                </TouchableOpacity>
            </View>
             </View>
    </SafeAreaView>
);
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#ffffff" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, height: 85 },
    headerTitleText: { fontSize: 22, fontWeight: "700", color: "#2e4466", textAlign: 'center', flex: 1 },
    addSectionContainer: { backgroundColor: '#f7f9fc', padding: 15, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#e1e8ee' },
    searchWrapper: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
        borderRadius: 12, paddingHorizontal: 15, height: 50,
        borderWidth: 0, elevation: 4, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 5, marginBottom: 22,
    },
    searchInput: { flex: 1, fontSize: 16, color: '#2e4466', borderWidth: 0, outlineStyle: 'none' },
    listContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 75,
},
    friendCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 15, padding: 12, marginTop: 2, marginBottom: 12, marginHorizontal: 2, alignItems: 'center', elevation: 2, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 6 },
    profilePic: { width: 45, height: 45, borderRadius: 22.5 },
    infoContainer: { flex: 1, marginLeft: 12 },
    nameText: { fontSize: 15, fontWeight: '700', color: '#333' },
    statusText: { fontSize: 12, color: '#27ae60', fontWeight: '500' },
    pendingSubText: { fontSize: 11, color: '#f39c12', fontStyle: 'italic' },
    row: { flexDirection: 'row', alignItems: 'center' },
    actionButtons: { flexDirection: 'row', alignItems: 'center' },
    addBtn: { flexDirection: 'row', backgroundColor: '#2e4466', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
    addBtnText: { color: 'white', marginLeft: 4, fontSize: 12, fontWeight: '600' },
    
    emptyBox: { 
        flex: 1, 
        alignItems: "center", 
        justifyContent: "center", 
        gap: 12, 
        marginTop: 210,
    },
    emptyText: { 
        color: "#94a3b8", 
        fontWeight: "700", 
        fontSize: 15,
        textAlign: 'center'
    },

    listSearchWrapper: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 5, backgroundColor: '#fff' },
    listSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f3f6', paddingHorizontal: 12, height: 45, borderRadius: 15, borderWidth: 1.5, borderColor: "#2e4466" },
    listSearchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#2e4466', outlineStyle: 'none' },
    
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 15,
    },
    modalBox: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 22,
        paddingTop: 15,
        paddingBottom: 25,
        paddingHorizontal: 40,
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
        textAlign: 'center'
    },
    shareButtonsRow: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    friendBtn: {
        flex: 1,
        backgroundColor: "#e5e5e5",
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: "center",
        marginRight: 10,
    },
    riderBtn: {
        flex: 1,
        backgroundColor: "#314a73",
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: "center",
        marginLeft: 10,
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
        bottom: 80,
        left: 20,
        right: 20,
        backgroundColor: '#e67e22',
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 999,
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    warningText: {
        color: '#fff',
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '600'
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
});

export default FriendsScreen;