import Vue from "vue";
import Vuex from "vuex";
import axiosAuth from "./axios-auth";
import router from "./router";
// import fresh axios instance
import globalAxios from "axios";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    idToken: null,
    userId: null,
    error: "",
    user: null
  },

  mutations: {
    // 6. Add a mutation to update the state
    AUTH_USER(state, userData) {
      state.idToken = userData.token;
      state.userId = userData.userId;
    },
    SET_ERROR(state, errorMessage) {
      state.error = errorMessage;
    },
    EMPTY_ERROR(state) {
      state.error = "";
    },
    CLEAR_DATA(state) {
      state.idToken = null;
      state.userId = null;
    },
    STORE_USER(state, user) {
      state.user = user;
    }
  },
  actions: {
    // // 4. Add signUp action for sending the data to axios
    signUp({ commit, dispatch }, authData) {
      axiosAuth
        .post("accounts:signUp?key=AIzaSyD2eB3yWcWXdxN67J-0NzrW69vvnbzjaRQ", {
          // data from SignUp.vue
          email: authData.email,
          password: authData.password,
          returnSecureToken: true
        })

        .then(res => {
          console.log(res);

          // 5. Get the auth token from the response (URL前半部分在axios-auth.js里)save the auth info in the state
          commit("AUTH_USER", {
            token: res.data.idToken,
            userId: res.data.localId
          });

          // // add the expiration time on the local storage
          // const now = new Date();
          // const expirationDate = new Date(
          //   now.getTime() + res.data.expiresIn * 1000
          // );

          // // save the response tokens into the local storage
          // localStorage.setItem("token", res.data.idToken);
          // localStorage.setItem("userId", res.data.localId);
          // localStorage.setItem("expirationDate", expirationDate);

          // store userId in the local storage
          localStorage.setItem("userId", res.data.localId);

          // save the user email in local sotrage for retrieving data
          localStorage.setItem("userEmail", authData.email);

          // send user to dashboard
          router.push({ name: "dashboard" });

          // dispatch action to store the user in DB
          dispatch("storeUser", authData);

          // set the logout timer in the end
          dispatch("setLogoutTimer", res.data.expiresIn);
        })

        // display any errors form the catch on the page instead of in the console
        .catch(error => {
          if (error.response) {
            console.log(error.response.data.error.message);
            commit("SET_ERROR", error.response.data.error.message);
          }
        });
    }, // closing Sign Up

    // 4. Add signIn action for sending the data to axios
    signIn({ commit, dispatch }, authData) {
      axiosAuth
        .post(
          "accounts:signInWithPassword?key=AIzaSyD2eB3yWcWXdxN67J-0NzrW69vvnbzjaRQ",
          {
            email: authData.email,
            password: authData.password,
            returnSecureToken: true
          }
        )
        .then(res => {
          console.log(res);

          // 5. Get the auth token from the response and save it in the state
          commit("AUTH_USER", {
            token: res.data.idToken,
            userId: res.data.localId
          });

          // // add the expiration time on the local storage
          // const now = new Date();
          // const expirationDate = new Date(
          //   now.getTime() + res.data.expiresIn * 1000
          // );

          // // save the response tokens into the local storage
          // localStorage.setItem("token", res.data.idToken);
          // localStorage.setItem("userId", res.data.localId);
          // localStorage.setItem("expirationDate", expirationDate);

          // send user to dashboard
          router.push({ name: "dashboard" });

          // save the user email in local storage for retrieving data
          localStorage.setItem("userEmail", authData.email);

          // set the logout timer to automatically call logout action when token expires
          dispatch("setLogoutTimer", res.data.expiresIn);
        })
        .catch(error => {
          if (error.response) {
            console.log(error.response.data.error.message);
            commit("SET_ERROR", error.response.date.error.message);
          }
        });
    }, // closing signIn

    // Setting the logout timer based on the expiration time
    setLogoutTimer({ dispatch }, expirationTime) {
      setTimeout(() => {
        // dispatch logout action when the expiration time is complete
        dispatch("logout");
      }, expirationTime * 1000);
    },

    // Allow users to stay logged in when refreshing the app.
    autoLogin({ commit }) {
      // get the token and expiration from the localStorage
      const token = localStorage.getItem("token");
      const expirationDate = localStorage.getItem("expirationDate");
      const userId = localStorage.getItem("userId");

      // get current time
      const now = new Date();
      // Check if the time now is more htan expirationDate set
      if (now >= expirationDate) {
        // if the time is grater than or equal to the expirationDate set then return from the funcation
        return;
      }
      // If the time now is less than the expiration time then commit the AUTH_USER mutation for adding the auth info to the state
      commit("AUTH_USER", {
        token: token,
        userId: userId
      });
    },

    clearError({ commit }) {
      commit("EMPTY_ERROR");
    },

    // logout action to allow users to clear the localStorage and state data
    logout({ commit }) {
      // Remove the token in local storage
      localStorage.removeItem("token");
      // Remove the expiration date
      localStorage.removeItem("expirationDate");
      // Remove userId in the local storage
      localStorage.removeItem("userId");
      // Remove userEmail in the local storage
      localStorage.removeItem("userEmail");

      // commit mutation to clear the state
      commit("CLEAR_DATA");

      // send user to signin page
      router.push({ name: "signin" });
    },

    storeUser({ state }, userData) {
      if (!state.idToken) {
        // log out
        return;
      }
      // send user infor to database
      // Authenticate REST Requests: https://firebase.google.com/docs/database/rest/auth?authuser=0
      globalAxios
        .post(
          "https://guo00090-final.firebaseio.com/users.json" +
            "?auth=" +
            state.idToken,
          userData
        )
        .then(res => console.log(res))
        .catch(error => console.log(error.message));
    },

    fetchUser({ commit, state }, userEmail) {
      if (!state.idToken) {
        return;
      }
      globalAxios
        .get(
          "https://guo00090-final.firebaseio.com/users.json" +
            "?auth=" +
            state.idToken
        )
        .then(res => {
          const data = res.data;

          for (let key in data) {
            const user = data[key];
            if (user.email == userEmail) {
              console.log(user);
              user.id = key;
              commit("STORE_USER", user);
            }
          }
        });
    },

    updateUser({ state }) {
      globalAxios
        .patch(
          "https://guo00090-final.firebaseio.com/users/" +
            state.user.id +
            ".json" +
            "?auth=" +
            state.idToken,
          { name: state.user.name }
        )
        .then(res => {
          console.log(res);
        })
        .catch(error => console.log(error.response));
    }
  },

  getters: {
    isAuthenticated(state) {
      // return token only if it is null
      return state.idToken !== null;
    },
    getUser(state) {
      return state.user;
    }
  }
});

// Web API Key: AIzaSyD2eB3yWcWXdxN67J-0NzrW69vvnbzjaRQ

// Database: https://guo00090-final.firebaseio.com/
