/* eslint-disable react/sort-comp */
import React, { useState, useEffect } from "react";
import {
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { isEmpty, isNil } from "lodash-es";
import { connect } from "react-redux";
import { Text, _enhancedNavigation, Container } from "sf-components";
import HeaderNormal from "sf-components/HeaderNormal";
import Touchable from "sf-components/Touchable";
import Icon from "sf-components/Icon";
import Spacer from "sf-components/Spacer";
import ButtonV2 from "sf-components/ButtonV2";

import {
  SHIP_GREY,
  SHIP_GREY_CALM,
  WHITE,
  SHADOW_GRADIENT,
  NAVY_DARK,
  REDDISH,
  PALE_BLUE,
  LIPSTICK_TWO,
  PALE_LIGHT_BLUE_TWO
} from "sf-constants/Colors";
import { V2PR_600, V2PR_50, V2PR_25 } from "sf-constants/ColorsV2";
import { LinearGradient } from "expo-linear-gradient";
import { HEADER } from "sf-constants/Styles";
import { WP1, WP2, WP3, WP4, WP5, WP8, WP80 } from "sf-constants/Sizes";
import style from "sf-styles/register";
import {
  convertBlobToBase64,
  fetchAsBlob,
  isTabletOrIpad,
} from "sf-utils/helper";
import { getCity, postLogin_V2, postCheckEmail } from "sf-actions/api";
import {
  setUserId,
  setAuthJWT,
  getUserEmail,
  setUserEmail,
  clearLocalStorage,
} from "sf-utils/storage";
import { GET_USER_DETAIL } from "sf-services/auth/actionTypes";
import { SET_REGISTRATION } from "sf-services/register/actionTypes";
import { registerDispatcher } from "sf-services/register";
import { isEmailValid } from "sf-utils/helper";
import { setLoading } from "sf-services/app/actionDispatcher";
import Wrapper from "./register/v3/Wrapper";


const mapStateToProps = ({ register }) => ({
  register,
});

const mapDispatchToProps = {
  setUserDetailDispatcher: (userDetail) => ({
    type: `${GET_USER_DETAIL}_SUCCESS`,
    response: userDetail,
  }),
  resetRegisterData: () => registerDispatcher.resetData(),
  setRegistration: (data) => ({
    type: SET_REGISTRATION,
    response: data,
  }),
  setLoading,
};

const mapFromNavigationParam = (getParam) => ({
  isLoginMMB: getParam("isLoginMMB", false),
});

const LoginEmailScreen = (props) => {
  const {
    dispatch,
    register: { data, behaviour },
    setUserDetailDispatcher,
    navigateTo,
    navigateBack,
    resetRegisterData,
    setRegistration,
    isLoginMMB
  } = props;

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [invalidPasswordCount, setInvalidPasswordCount] = useState(0);
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [borderColor, setBorderColor] = useState(SHIP_GREY_CALM); 
  const isValidEmail = isEmailValid(email);

  const getBase64 = async (url) => {
    let result = await fetchAsBlob(url);
    let base64 = await convertBlobToBase64(result);
    return base64;
  }

  useEffect(() => getEmail(), []);

  const _renderHeader = () => {
    return (
      <View>
        <HeaderNormal
          style={style.headerNormal}
          centered
          iconLeftOnPress={navigateBack}
          textType={"Circular"}
          textSize={"mini"}
          iconStyle={{ marginRight: WP5 }}
          text={"Continue With Email"}
        />
        <LinearGradient colors={SHADOW_GRADIENT} style={HEADER.shadow} />
      </View>
    );
  };

  const getEmail = async () => {
    try {
      const userEmail = await getUserEmail();
      if (userEmail !== null) {
        setEmail(userEmail);
      } else {
        setEmail(null);
      }
    } catch (e) {
      //
    }
  };

  const onSubmit = () => {
    if (!isEmailValid(email)) {
      setEmailError("Email belum terdaftar. Daftar sekarang!");
    } else {
      setLoading(true);


      postLogin_V2({ email, password, mobile: true })
        .then(async (response) => {
          const { status, result } = response.data;
          if (status === "failed") {
            postCheckEmail({ email }).then(({ data: { status } }) => {
              if (status === "success") {
                if (invalidPasswordCount < 1) {
                  setPasswordError("Password kamu salah. Lupa password?");
                  setInvalidPasswordCount(1 + invalidPasswordCount);
                }
              } else {
                setEmailError("Email belum terdaftar. Daftar Sekarang!");
              }
            });
          } else {
            const dataResponse = result;
            let city_name = null;
            let {
              registration_step,
              id_user,
              email,
              id_city,
              full_name,
              profile_type,
              profile_picture,
              registration_version,
              email_status,
            } = dataResponse;
            const isV3 = registration_version == "3.0";
            if (registration_step !== "finish") {
              try {
                if (!isEmpty(profile_picture)) {
                  profile_picture = await getBase64(profile_picture);
                }
              } catch (err) {
                // better keep silent
              } finally {
                const step = parseInt(registration_step);
                if (!isNil(id_city)) {
                  const cities = await dispatch(getCity, { offset: 0 });
                  const city = cities.filter(
                    (city) => parseInt(city.id_city) == parseInt(id_city)
                  )[0];
                  city_name = city.city_name;
                }
                Promise.resolve(
                  setRegistration({
                    behaviour: {
                      ...behaviour,
                      step: !isV3
                        ? 3
                        : step < 3
                          ? email_status === "waiting"
                            ? 2
                            : 3
                          : step + 1,
                    },
                    data: {
                      ...data,
                      id_user,
                      id_city,
                      city_name,
                      email,
                      profile_type,
                      profile_picture,
                      name: full_name,
                    },
                  })
                ).then(() => {
                  setLoading(false);
                  navigateTo("RegisterV3");
                });
              }
            } else {
              try {
                await clearLocalStorage();
              } catch (e) {
                //
              }
              await setUserId(result.id_user);
              await setAuthJWT(result.token);
              await setUserEmail(email);
              resetRegisterData();
              setUserDetailDispatcher(result);
              navigateTo("LoadingScreen", {}, "replace");
            }
          }
        })
        .catch(() => { })
        .then(() => setLoading(false));
    }
  }

  return (
    <Container renderHeader={_renderHeader} isLoading={isLoading}>
      <Wrapper>
        <Spacer size={WP2} />
        <Text
          color={NAVY_DARK}
          size={isTabletOrIpad() ? "mini" : "medium"}
          weight={600}
          type={"Circular"}
        >
          Welcome back!
        </Text>
        <Spacer size={WP1} />
        <Text
          style={style.label}
          size={isTabletOrIpad() ? "tiny" : "xmini"}
          weight={400}
          type={"Circular"}
        >
          Log in to Connect, Interact & Collaborate
        </Text>
        <Spacer size={WP8} />
        <View style={style.formGroup}>
          <Text
            style={style.label}
            size={isTabletOrIpad() ? "tiny" : "xmini"}
            weight={400}
            type={"Circular"}
          >
            Email
          </Text>
          <TextInput
            defaultValue={email}
            onChangeText={(email) => {
              setEmail(email);
              setEmailError(null);
            }}
            keyboardType={"email-address"}
            autoCompleteType={"email"}
            placeholder={"Tuliskan email"}
            style={[
              style.input,
              { borderColor: email !== '' && !isValidEmail ? SHIP_GREY_CALM : V2PR_600,
              borderWidth: 2,
          },
          ]}
          />
          {!isEmpty(emailError) && !isEmpty(email) && (
            <TouchableOpacity
              onPress={() => {
                emailError.split(". ")[0] === "Email belum terdaftar" &&
                  navigateTo("RegisterV3");
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  size={isTabletOrIpad() ? "petite" : "tiny"}
                  color={LIPSTICK_TWO}
                  weight={400}
                  type={"Circular"}
                >
                  {emailError.split(". ")[0]}.{" "}
                  <Text
                    size={isTabletOrIpad() ? "petite" : "tiny"}
                    color={LIPSTICK_TWO}
                    weight={400}
                    style={{ textDecorationLine: "underline" }}
                    type={"Circular"}
                  >
                    {emailError.split(". ")[1]}
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {/*!isEmpty(errorMessage) && (<Text
						size={'tiny'}
						color={TOMATO_CALM}
						weight={500}
						type={'NeoSans'}
						>
						{errorMessage}
					</Text>)*/}
        </View>
        <View style={style.formGroup}>
          <View style={{ flexDirection: "row" }}>
            <Text
              style={style.label}
              size={isTabletOrIpad() ? "tiny" : "xmini"}
              weight={400}
              type={"Circular"}
            >
              {isLoginMMB ? "Passcode" : "Password"}
            </Text>
            {isLoginMMB && (
              <Text
                style={{
                  ...style.label,
                  color: PALE_LIGHT_BLUE_TWO,
                  marginLeft: WP1,
                }}
                size={isTabletOrIpad() ? "tiny" : "xmini"}
                weight={400}
                type={"Circular"}
              >
                Silahkan cek email kamu
              </Text>
            )}
          </View>
          <View>
            <TextInput
              defaultValue={password}
              onChangeText={(password) => {
                setPassword(password);
                setPasswordError(null);
              }}
              secureTextEntry={!showPassword}
              autoCompleteType={"password"}
              placeholder={
                isLoginMMB
                  ? "6 digit angka unik di email kamu"
                  : "Tuliskan password"
              }
              style={style.input}
            />
            <Touchable
              onPress={() => setShowPassword(!showPassword)}
              style={style.passwordToggler}
            >
              <Icon
                color={SHIP_GREY_CALM}
                type={"MaterialCommunityIcons"}
                name={showPassword ? "eye-off" : "eye"}
              />
            </Touchable>
            {!isEmpty(passwordError) && !isEmpty(password) && (
              <TouchableOpacity
                onPress={() => {
                  passwordError.split(". ")[0] === "Password kamu salah" &&
                    navigateTo("ForgotPasswordScreen");
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    size={isTabletOrIpad() ? "petite" : "tiny"}
                    color={LIPSTICK_TWO}
                    weight={400}
                    type={"Circular"}
                  >
                    {passwordError.split(". ")[0]}.{" "}
                    <Text
                      size={isTabletOrIpad() ? "petite" : "tiny"}
                      color={LIPSTICK_TWO}
                      weight={400}
                      style={{ textDecorationLine: "underline" }}
                      type={"Circular"}
                    >
                      {passwordError.split(". ")[1]}
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {!passwordError && (
          <TouchableOpacity
            onPress={() => navigateTo("ForgotPasswordScreen")}
            style={{
              alignItems: "flex-end",
              width: 120,
              marginLeft: "auto",
              marginTop: -18,
              paddingVertical: WP2,
              marginBottom: WP5,
            }}
          >
            <Text
              centered
              // type={"NeoSans"}
              weight={500}
              size={"xmini"}
              color={SHIP_GREY_CALM}
              type={"Circular"}
            >
              Lupa password?
            </Text>
          </TouchableOpacity>
        )}
        <Spacer size={passwordError ? WP8 : WP3} />
        <View style={{ marginBottom: WP3 }}>
          <ButtonV2
            style={{ paddingVertical: WP4 }}
            textSize={"slight"}
            text="Log In"
            onPress={onSubmit}
            disabled={!password || !email}
            textColor={WHITE}
            color={V2PR_600}
          />
        </View>
      </Wrapper>

      {!keyboardVisible && (
        <Touchable
          activeOpacity={0.8}
          onPress={() => navigateTo("RegisterV3")}
          style={{
            alignSelf: "center",
            paddingVertical: WP4,
            position: "absolute",
            bottom: 0,
            borderTopWidth: 1,
            width: WP80,
            borderTopColor: PALE_BLUE,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            <Text size="xmini" color={SHIP_GREY}>
              {"Belum punya akun? "}
            </Text>
            <Text size="xmini" weight={500} color={SHIP_GREY}>
              Daftar disini
            </Text>
          </View>
        </Touchable>
      )}
    </Container>
  )
}

export default _enhancedNavigation(
  connect(mapStateToProps, mapDispatchToProps)(LoginEmailScreen),
  mapFromNavigationParam
);
