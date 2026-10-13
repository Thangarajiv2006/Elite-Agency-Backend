import { NextFunction, Request, Response } from "express";
import jsonwebtoken from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  AuthenticationError,
  DatabaseError,
  ValidationError,
} from "../utils/error-handler";
import { otpGenerator } from "../utils";
import { sendEmail } from "../utils/send-mailer";
import agency from "../models/agency.model";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;
const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const fssaiRegex = /^\d{14}$/;
const pincodeRegex = /^\d{6}$/;

export const signupRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    agencyName,
    email,
    phone,
    pan,
    gst,
    fssai,
    plotNo,
    street,
    village,
    district,
    state,
    stateCode,
    pinCode,
    password,
    name,
  } = req.body;
  if (!agencyName) {
    return next(new ValidationError("Agency name is required"));
  }
  if (!name) {
    return next(new ValidationError("Name is required"));
  }
  if (!email || !emailRegex.test(email)) {
    return next(new ValidationError("Valid email is required"));
  }
  if (!phone || !phoneRegex.test(phone)) {
    return next(new ValidationError("Valid phone number is required"));
  }
  if (!pan || !panRegex.test(pan)) {
    return next(new ValidationError("Valid PAN number is required"));
  }
  if (!gst || !gstRegex.test(gst)) {
    return next(new ValidationError("Valid GST number is required"));
  }
  if (!fssai || !fssaiRegex.test(fssai)) {
    return next(new ValidationError("Valid FSSAI number is required"));
  }
  if (!plotNo) {
    return next(new ValidationError("Plot number is required"));
  }
  if (!street) {
    return next(new ValidationError("Street is required"));
  }
  if (!village) {
    return next(new ValidationError("Village is required"));
  }
  if (!district) {
    return next(new ValidationError("District is required"));
  }
  if (!state) {
    return next(new ValidationError("State is required"));
  }
  if (!stateCode) {
    return next(new ValidationError("State code is required"));
  }
  if (!pinCode || !pincodeRegex.test(pinCode)) {
    return next(new ValidationError("Valid pincode is required"));
  }
  if (!password || password.length < 6) {
    return next(
      new ValidationError("Password must be at least 6 characters long"),
    );
  }

  const existingUser = await agency.findOne({ email });
  if (existingUser) {
    return next(new ValidationError("Email is already registered"));
  }

  try {
    const otp = otpGenerator();

    const token = jsonwebtoken.sign(
      { email, otp },
      process.env.JWT_OTP_SECRET!,
      {
        expiresIn: "5m",
      },
    );
    const result = await sendEmail(
      email,
      "OTP for Registration",
      "registration-otp-template",
      { name, otp },
    );

    if (!result) {
      return next(new ValidationError("Failed to send OTP email"));
    } else {
      return res.status(200).json({
        status: "success",
        message: "OTP sent to email successfully",
        token,
      });
    }
  } catch (error) {
    return next(
      new ValidationError("An error occurred while processing your request"),
    );
  }
};

export const createAgency = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    agencyName,
    email,
    phone,
    pan,
    gst,
    fssai,
    plotNo,
    street,
    village,
    district,
    state,
    stateCode,
    pinCode,
    password,
    name,
  } = req.body;
  if (!agencyName) {
    return next(new ValidationError("Agency name is required"));
  }
  if (!name) {
    return next(new ValidationError("Name is required"));
  }
  if (!email || !emailRegex.test(email)) {
    return next(new ValidationError("Valid email is required"));
  }
  if (!phone || !phoneRegex.test(phone)) {
    return next(new ValidationError("Valid phone number is required"));
  }
  if (!pan || !panRegex.test(pan)) {
    return next(new ValidationError("Valid PAN number is required"));
  }
  if (!gst || !gstRegex.test(gst)) {
    return next(new ValidationError("Valid GST number is required"));
  }
  if (!fssai || !fssaiRegex.test(fssai)) {
    return next(new ValidationError("Valid FSSAI number is required"));
  }
  if (!plotNo) {
    return next(new ValidationError("Plot number is required"));
  }
  if (!street) {
    return next(new ValidationError("Street is required"));
  }
  if (!village) {
    return next(new ValidationError("Village is required"));
  }
  if (!district) {
    return next(new ValidationError("District is required"));
  }
  if (!state) {
    return next(new ValidationError("State is required"));
  }
  if (!stateCode) {
    return next(new ValidationError("State code is required"));
  }
  if (!pinCode || !pincodeRegex.test(pinCode)) {
    return next(new ValidationError("Valid pincode is required"));
  }
  if (!password || password.length < 6) {
    return next(
      new ValidationError("Password must be at least 6 characters long"),
    );
  }

  const existingUser = await agency.findOne({ email });
  if (existingUser) {
    return next(new ValidationError("Email is already registered"));
  }

  const hashedPassword = await bcrypt.hash(password, 5);

  const data = {
    agencyName,
    name,
    email,
    mobile: phone,
    password: hashedPassword,
    PAN: pan,
    GSTIN: gst,
    FSSAI: fssai,
    address: {
      plotNo,
      street,
      village,
      district,
      state,
      stateCode,
      pinCode,
    },
  };

  await agency
    .create(data)
    .then(() =>
      res
        .status(201)
        .json({ status: "success", message: "Account Created Successfully!" }),
    )
    .catch(() => next(new DatabaseError("Failed to create agency account")));
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, password } = req.body;
  if (!email || !emailRegex.test(email)) {
    return next(new ValidationError("Valid email is required"));
  }
  if (!password) {
    return next(new ValidationError("Password is required"));
  }
  const existingUser = await agency.findOne({ email }).catch(() => {
    return next(new DatabaseError("Failed to fetch user data"));
  });

  if (!existingUser) {
    return next(new ValidationError("Invalid email or password"));
  }
  const isPasswordValid = await bcrypt.compare(password, existingUser.password);
  if (!isPasswordValid) {
    return next(new ValidationError("Invalid email or password"));
  }

  const token = jsonwebtoken.sign(
    { user: existingUser._id },
    process.env.JWT_AUTH_SECRET!,
    {
      expiresIn: "7d",
    },
  );

  return res.status(200).json({
    status: "success",
    message: "Login successful",
    user: {
      _id: existingUser._id,
      agencyName: existingUser.agencyName,
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.mobile,
      address: existingUser.address,
      pan: existingUser.PAN,
      gst: existingUser.GSTIN,
      fssai: existingUser.FSSAI,
    },
    token,
  });
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { agencyName, phone, pan, gst, fssai, address, name } = req.body;
  if (!agencyName) {
    return next(new ValidationError("Agency name is required"));
  }
  if (!name) {
    return next(new ValidationError("Name is required"));
  }

  if (!phone || !phoneRegex.test(phone)) {
    return next(new ValidationError("Valid phone number is required"));
  }
  if (!pan || !panRegex.test(pan)) {
    return next(new ValidationError("Valid PAN number is required"));
  }
  if (!gst || !gstRegex.test(gst)) {
    return next(new ValidationError("Valid GST number is required"));
  }
  if (!fssai || !fssaiRegex.test(fssai)) {
    return next(new ValidationError("Valid FSSAI number is required"));
  }
  if (!address.plotNo) {
    return next(new ValidationError("Plot number is required"));
  }
  if (!address.street) {
    return next(new ValidationError("Street is required"));
  }
  if (!address.village) {
    return next(new ValidationError("Village is required"));
  }
  if (!address.district) {
    return next(new ValidationError("District is required"));
  }
  if (!address.state) {
    return next(new ValidationError("State is required"));
  }
  if (!address.stateCode) {
    return next(new ValidationError("State code is required"));
  }
  if (!address.pinCode || !pincodeRegex.test(address.pinCode)) {
    return next(new ValidationError("Valid pincode is required"));
  }

  const existingUser = await agency
    .findOne({ _id: req.user })
    .catch(() => next(new DatabaseError()));
  if (existingUser === null) {
    return next(new AuthenticationError());
  }

  await agency
    .findOneAndUpdate(
      { _id: req.user },
      {
        agencyName,
        name,
        FSSAI: fssai,
        GSTIN: gst,
        PAN: pan,
        mobile: phone,
        address: {
          plotNo: address.plotNo,
          street: address.street,
          village: address.village,
          district: address.district,
          state: address.state,
          stateCode: address.stateCode,
          pinCode: address.pinCode,
        },
      },
      {
        runValidators: true,
        new: true,
      },
    )
    .then((data) => {
      return res.status(201).json({
        status: "success",
        message: "Profile Updated Successfully",
        user: {
          _id: data?._id,
          agencyName: data?.agencyName,
          name: data?.name,
          email: data?.email,
          phone: data?.mobile,
          address: data?.address,
          pan: data?.PAN,
          gst: data?.GSTIN,
          fssai: data?.FSSAI,
        },
      });
    })
    .catch(() => {
      next(new DatabaseError());
    });
};

export const sendForgotEmailOTP = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.body.email || !emailRegex.test(req.body.email)) {
    return next(new ValidationError("Invalid Email"));
  }

  const otp = otpGenerator();

  const existingEmail = await agency.findOne({ email: req.body.email });
  if (existingEmail === null) {
    return next(new ValidationError("Email Doesn't Exist"));
  }
  const result = await sendEmail(
    req.body.email,
    "OTP for Registration",
    "forgot-password-otp-template",
    { name: existingEmail.name, otp },
  );

  const token = jsonwebtoken.sign(
    { email: req.body.email, otp },
    process.env.JWT_OTP_SECRET!,
    { expiresIn: "5m" },
  );

  if (!result) {
    return next(new ValidationError("Failed to send OTP email"));
  } else {
    return res.status(200).json({
      status: "success",
      message: "OTP sent to email successfully!",
      token,
    });
  }
};

export const verifyForgotOTP = (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "OTP Verified Successfully!",
  });
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, password } = req.body;
  if (!password || password.length < 6) {
    return next(
      new ValidationError("Password must be at least 6 characters long"),
    );
  }
  if (!email || !emailRegex.test(email)) {
    return next(new ValidationError("Valid email is required"));
  }

  const hashedPassword = await bcrypt.hash(password, 5);
  await agency
    .findOneAndUpdate({ email: email }, { password: hashedPassword })
    .then(() => {
      return res.status(201).json({
        status: "success",
        message: "Password Changed Successfully",
      });
    })
    .catch(() => next(new DatabaseError()));
};
