import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { isEmpty, includes, isNil } from "lodash-es";
import { connect } from "react-redux";
import { Text } from "sf-components";
import Spacer from "sf-components/Spacer";
import Icon from "sf-components/Icon";
import ButtonV2 from "sf-components/ButtonV2";
import Touchable from "sf-components/Touchable";
import ConfirmationModalV3 from "sf-components/ConfirmationModalV3";
import {
  LIPSTICK_TWO,
  SHIP_GREY_CALM,
  REDDISH,
  WHITE,
  NAVY_DARK,
} from "sf-constants/Colors";
import { V2PR_600, V2PR_50, NE_600, NE_900, NE_300 } from "sf-constants/ColorsV2";
import { WP1, WP2, WP4, WP8 } from "sf-constants/Sizes";
import style from "sf-styles/register";
import { postRegisterV3, postCheckEmail } from "sf-actions/api";
import { isEmailValid, isTabletOrIpad } from "sf-utils/helper";
import { registerDispatcher } from "sf-services/register";
import Wrapper from "./Wrapper";
import { setAuthJWT } from "sf-utils/storage";

const mapStateToProps = ({ auth, register }) => ({
  step: register.behaviour.step,
  showPassword: register.behaviour.showPassword,
  ctaEnabled: register.behaviour.ctaEnabled,
  performHttp: register.behaviour.performHttp,
  email: register.data.email,
  id_user: register.data.id_user,
  password: register.data.password,
});

const mapDispatchToProps = {
  setPasswordVisibility: (visible) =>
    registerDispatcher.setPasswordVisibility(visible),
  setCtaEnabled: (enabled) => registerDispatcher.setCtaEnabled(enabled),
  setEmail: (email) => registerDispatcher.setData({ email }),
  setPassword: (password) => registerDispatcher.setData({ password }),
  setIdUser: (id_user) => registerDispatcher.setData({ id_user }),
  setStep: (step) => registerDispatcher.setStep(step),
  setPerformHttp: (performHttp) =>
    registerDispatcher.setPerformHttp(performHttp),
};

const Credentials = (props) => {
  const {
    email,
    password,
    setCtaEnabled,
    id_user,
    setPerformHttp,
    setStep,
    step,
    setIdUser,
    setEmail,
    setPassword,
    showPassword,
    performHttp,
    setPasswordVisibility,
  } = props;
  const [modalVisible, setModalVisible] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(false);

  const checkEmail = () => {
    if (!isEmpty(email)) {
      if (!isEmailValid(email)) {
        setEmailError("Email belum sesuai, mohon periksa kembali.");
      } else {
        postCheckEmail({ email }).then(({ data: { status } }) => {
          if (status === "success") {
            setEmailError("Email telah digunakan. Gunakan email lainnya");
            setEmailAvailable(false);
            setModalVisible(false);
          } else {
            setEmailError(null);
            setEmailAvailable(true);
          }
        });
      }
    }
  };

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  const onSubmit = () => {
    if (!isEmailValid(email)) {
      setEmailError("Your email is invalid");
      toggleModal();
    } else {
      Promise.all([toggleModal(), setPerformHttp(true)]).then(() => {
        let postData = { email, password };
        if (!isNil(id_user)) postData.id_user = id_user;
        postRegisterV3(postData)
          .then(async ({ data: { code, message, result } }) => {
            if (includes(message || "", "already")) {
              setEmailError("Your email address has been used");
            } else if (includes(message || "", "character")) {
              setPasswordError("Password must be at least 6 characters long");
            } else {
              const { id_user, token } = result;
              setIdUser(id_user.toString());
              await setAuthJWT(token);
              setCtaEnabled(true);
              setStep(step + 1);
            }
          })
          .catch((e) => {
            // keep silent
          })
          .then(() => {
            setPerformHttp(false);
          });
      });
    }
  };

  const onChangeText = (value, callback, field) => {
    Promise.all([
      field === "email" && setEmailAvailable(false),
      setEmailError(null),
      callback(value),
    ]).then(() => {
      timeout = setTimeout(() => {
        const isEnabled =
          !isEmpty(email) &&
          !isEmpty(password) &&
          isEmailValid(email) &&
          (password || "").length >= 6;
        setCtaEnabled(isEnabled);
        if (field === "email" && isEmailValid(email)) {
          try {
            typeof timeout !== "undefined" && clearTimeout(timeout);
          } catch (e) {
            // Keep silent
          } finally {
            timeout = setTimeout(() => {
              postCheckEmail({ email }).then(({ data: { status } }) => {
                if (isNil(id_user) && status === "success") {
                  setEmailError("Email telah digunakan. Gunakan email lainnya");
                  setEmailAvailable(false);
                } else {
                  setEmailError(null);
                  setEmailAvailable(true);
                }
              });
            }, 500);
          }
        }
        if (field === "password") {
          setPasswordError(
            (password || "").length < 6 && !isEmpty(password)
              ? "Password belum sesuai"
              : null
          );
        }
      }, 250);
    });
  };

  return (
    <View>
      
      <Wrapper>
        <Spacer size={WP2} />
        <Text
          color={NE_900}
          size={isTabletOrIpad() ? "mini" : "medium"}
          weight={600}
          type={"Circular"}
        >
          Buat akun
        </Text>
        <Spacer size={WP1} />
        <Text
          style={style.label}
          size={isTabletOrIpad() ? "tiny" : "xmini"}
          weight={400}
          type={"Circular"}
        >
          Buat akunmu dan mulai berkolaborasi
        </Text>
        <Spacer size={WP8} />
        <View style={style.formGroup}>
          <Text
             style={{
              fontSize: isTabletOrIpad() ? 12 : 14,
              color: "ne_900",
              fontWeight: "400",
               // Sesuaikan dengan margin yang diinginkan
            }}
            //type={"Circular"}
          >
            Email
          </Text>
          <TextInput
            onBlur={() => checkEmail()}
            defaultValue={email}
            editable={!performHttp}
            onChangeText={(value) => onChangeText(value, setEmail, "email")}
            keyboardType={"email-address"}
            autoCompleteType={"email"}
            placeholder={"Tuliskan email"}
            style={[
              style.input,
              {
                  borderWidth: 2, // Ukuran border 2px
                  borderColor: isEmpty(email)
                      ? SHIP_GREY_CALM
                      : emailError
                      ? LIPSTICK_TWO
                      : V2PR_600,
              },
              { opacity: performHttp ? 0.6 : 1 }, 
            ]}
          />
          {!isEmpty(emailError) && !isEmpty(email) && (
            <Text
              size={isTabletOrIpad() ? "petite" : "tiny"}
              color={LIPSTICK_TWO}
              weight={400}
              type={"Circular"}
            >
              {emailError}
            </Text>
          )}
        </View>
        <View style={style.formGroup}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Text
      // 
      style={{
        fontSize: isTabletOrIpad() ? 12 : 14,
        color: "ne_900",
        fontWeight: "400",
         // Sesuaikan dengan margin yang diinginkan
      }}
    >
      Password
    </Text>
    <Text
      style={{
        fontSize: isTabletOrIpad() ? 12 : 14,
        color: "NE_300",
        fontWeight: "200",
        marginLeft: 8, // Sesuaikan dengan margin yang diinginkan
      }}
    >
      (password min 6)
    </Text>
  </View>
          <View>
            <TextInput
              defaultValue={password}
              onChangeText={(value) =>
                onChangeText(value, setPassword, "password")
              }
              secureTextEntry={!showPassword}
              autoCompleteType={"password"}
              placeholder={"Tuliskan password"}
              style={[
                style.input,
                {
                    borderWidth: 2, // Ukuran border 2px
                    borderColor: isEmpty(password)
                        ? SHIP_GREY_CALM
                        : passwordError
                        ? LIPSTICK_TWO
                        : V2PR_600,
                },
                { opacity: performHttp ? 0.6 : 1 }, 
              ]}
            />
            {/*<Text
            onPress={() => setPasswordVisibility(!showPassword)}
            style={style.passwordToggler}
            size={isTabletOrIpad() ? 'xtiny' : 'tiny'}
            color={showPassword ? GREY : GREY_PLACEHOLDER}
            weight={400}
            type={'Circular'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </Text>*/}
            <Touchable
              onPress={() => setPasswordVisibility(!showPassword)}
              style={style.passwordToggler}
            >
              <Icon
                color={SHIP_GREY_CALM}
                type={"MaterialCommunityIcons"}
                name={showPassword ? "eye-off" : "eye"}
              />
            </Touchable>
          </View>
          {!isEmpty(passwordError) && !isEmpty(password) && (
            <Text
              size={isTabletOrIpad() ? "petite" : "tiny"}
              color={LIPSTICK_TWO}
              weight={400}
              type={"Circular"}
            >
              {passwordError}
            </Text>

            
          )}
          
          <Spacer size={WP4} />
          <Text
  style={{
    fontSize: 12,
    color: NE_600,
    fontWeight: "400",
    textAlign: "left",
    marginBottom: WP4, // Sesuaikan dengan margin yang diinginkan
  }}
>
  Dengan menekan tombol “Buat Akun”, saya menyetujui   
  <View style={{ flexDirection: 'row' }}>
      <Text style={{ color: V2PR_600, fontSize: 12, marginTop: 5, marginRight: 5}}> Syarat dan Ketentuan</Text>
    </View>
    
    dari Eventeer
  </Text>
          
          <ButtonV2
            style={{ paddingVertical: WP4 }}
            textSize={"slight"}
            text="Buat Akun"
            onPress={() => Promise.all([toggleModal(), checkEmail()])}
            disabled={!!emailError || !!passwordError || !password || !email}
            textColor={WHITE}
            color={V2PR_600}
          />


        </View>
      </Wrapper>
      <ConfirmationModalV3
        visible={modalVisible && !emailError && emailAvailable}
        title={`Lanjutkan buat akun dengan ${email}`}
        subtitle="Belum ada akun yang menggunakan email ini"
        primary={{
          text: "Ya, Lanjutkan",
          onPress: () => onSubmit(),
        }}
        secondary={{
          text: "Batalkan",
          onPress: () => toggleModal(),
        }}
      />
    </View>
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(Credentials);
