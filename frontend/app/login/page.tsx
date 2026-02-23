"use client"; //this is a client component, so we can use useState and useEffect

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
useState is a hook that allows us to store state in a component like a memory in a variable
for example:
const [isLogin, setIsLogin] = useState(!modeFromUrl);
isLogin is a boolean variable that determines if the user is logged in or not
setIsLogin is a function that allows us to set the value of isLogin
**/

/**
type FormData is a type that defines the structure of the form data 
when the user fills the form, automatically the data is stored in the formData variable
**/

//useRouter is a hook that allows us to navigate to different pages
//useSearchParams is a hook that allows us to get the search parameters from the URL


type FormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

/**
 * FormErrors represents validation errors for the form fields.
 * 
 * The idea is simple:
 * - The form has fields: username, email, password, confirmPassword
 * - Each field MAY have an error message (a string)
 * - Not all fields must have errors at the same time
 * 
 * For example:
 * {
 *   username: "Username is required",
 *   email: "Invalid email address"
 * }
 * 
 * Fields without errors are simply not included.
 */

type FormErrors = Partial<Record<keyof FormData, string>>;

//initialForm is an object that contains the initial values of the form of the page
const initialForm: FormData = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeFromUrl = searchParams.get("mode") === "register";

  const [isLogin, setIsLogin] = useState(!modeFromUrl);
  //formData is an object that contains the values of the form
  const [formData, setFormData] = useState<FormData>(initialForm);
  //formErrors is an object that contains the errors of the form
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  //serverError is a string variable that contains the error message from the server
  const [serverError, setServerError] = useState("");
  //isSubmitting is a boolean variable that determines if the form is being submitted
  //if the user clicks the submit button, the form will be submitted and the isSubmitting variable will be set to true and the button will be disabled
  const [isSubmitting, setIsSubmitting] = useState(false);

  //useEffect is a code that runs automatically when the component is mounted
  //in this case, we want to sync the URL mode to the form
  //if the URL is /register, we want to set the form to the register form
  //if the URL is /login, we want to set the form to the login form
 
  // Sync URL mode to form (e.g. /register → register form)
  useEffect(() => {
    setIsLogin(!modeFromUrl);
  }, [modeFromUrl]); //the [modeFromUrl] is what the useEffect listens to, so when the modeFromUrl changes, the useEffect will run


// Why do we clear errors when switching between Register and Login?
// Imagine this scenario:
// 1. The user is on the Register form
// 2. They make a mistake and see a red error message
// 3. Then they switch to the Login form
//
// If we do NOT clear the errors,
// the registration error would still appear on the login screen,
// which is confusing and incorrect.
//
// Therefore, when the mode changes (Login ↔ Register),
// we reset all form and server errors.
  useEffect(() => {
    setFormErrors({});
    setServerError("");
  }, [isLogin]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //e.target is the input element that the user is typing in
    //name is the name of the input element
    //value is the value of the input element
    //for example name is "username" and value is "John Doe"
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    //if the input element has an error, we clear the error because the user is typing in the input element
    if (formErrors[name as keyof FormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = (): boolean => {
    const errors: FormErrors = {}; //errors is an object that contains the errors of the form
    //if the username is empty, we add an error message
    if (!formData.username.trim()) {
      errors.username = "Username is required";
      //if the username is less than 3 characters, we add an error message
    } else if (formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    //if the user is on the register form, we check if the email is empty
    if (!isLogin) {
      if (!formData.email.trim()) {
        errors.email = "Email is required";
        //if the email is not a valid email address, we add an error message
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email address";
      }
    }
    //if the password is empty, we add an error message
    if (!formData.password) {
      errors.password = "Password is required";
    }
    //if the user is on the register form, we check if the confirm password is empty
    if (!isLogin) {
      if (!formData.confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
        //if the passwords do not match, we add an error message
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }
    //set the errors to the formErrors variable
    setFormErrors(errors);
    //return true if there are no errors, otherwise return false
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    //e is the event object that is triggered when the user clicks the submit button
    //preventDefault is a method that prevents the default behavior of the form, its preventing the form from being submitted and the page from being refreshed and delete the data from the form
    e.preventDefault();
    //set the server error to an empty string
    setServerError("");
    //lock the form from being submitted if there are errors
    if (!validate()) return;

    //disable the submit button
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          //credentials: "include" is a method that includes the cookies in the request
          credentials: "include",
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setServerError(data.message || "Login failed");
          return;
        }
        router.push("/"); //redirect to the home page
        router.refresh(); //refresh the page to get the new data from the server
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setServerError(data.message || "Registration failed");
          return;
        }
        //success message, then switch to login form
        setServerError("");

        setFormData({
          ...initialForm,
          username: formData.username,
        });
        setFormErrors({});
        setIsLogin(true);
        setServerError("Account created successfully! Please sign in.");
      }
    } catch {
      setServerError(isLogin ? "Login failed" : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getError = (field: keyof FormData) => formErrors[field] ?? "";

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left: branding / visual */}
      <div className="md:w-2/5 bg-gradient-to-br from-sky-700 to-teal-700 text-white p-8 md:p-12 flex flex-col justify-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-sky-100">
          Afeka Trips Routes 2026
        </h1>
        <p className="mt-3 text-sky-200/90 text-sm md:text-base max-w-xs">
          Plan hiking and cycling routes with maps and weather.
        </p>
        <div className="mt-10 hidden md:block border-l-2 border-sky-300/60 pl-6 text-sky-200/80 text-sm">
          Sign in to save routes and view your history.
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100">
            {isLogin ? "Sign in" : "Create account"}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isLogin
              ? "Use your username and password."
              : "Register with email and username."}
          </p>

          {serverError && (
            <div
              role="alert"
              className={`mt-4 px-3 py-2 rounded-lg text-sm ${
                serverError.includes("successfully")
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                }`}
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} action="#" method="post" className="mt-6 space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`mt-1 block w-full rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                    getError("email") ? "border-red-500" : "border-slate-300 dark:border-slate-600"
                  }`}
                />
                {getError("email") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getError("email")}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Username
              </label>
              <input
                id="username"
                type="text"
                name="username"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Your username"
                className={`mt-1 block w-full rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                  getError("username") ? "border-red-500" : "border-slate-300 dark:border-slate-600"
                }`}
              />
              {getError("username") && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getError("username")}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`mt-1 block w-full rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                  getError("password") ? "border-red-500" : "border-slate-300 dark:border-slate-600"
                }`}
              />
              {getError("password") && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getError("password")}</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`mt-1 block w-full rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                    getError("confirmPassword") ? "border-red-500" : "border-slate-300 dark:border-slate-600"
                  }`}
                />
                {getError("confirmPassword") && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getError("confirmPassword")}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 rounded-lg bg-sky-600 text-white py-2.5 font-medium hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-60 disabled:pointer-events-none transition-colors"
            >
              {isSubmitting ? "Processing…" : isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin((prev) => !prev);
                setFormData(initialForm);
                setFormErrors({});
                setServerError("");
              }}
              disabled={isSubmitting}
              className="font-medium text-sky-600 dark:text-sky-400 hover:underline disabled:opacity-60"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}

function LoginLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="md:w-2/5 bg-gradient-to-br from-sky-700 to-teal-700 text-white p-8 md:p-12 flex flex-col justify-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-sky-100">
          Afeka Trips Routes 2026
        </h1>
        <p className="mt-3 text-sky-200/90 text-sm md:text-base max-w-xs">
          Plan hiking and cycling routes with maps and weather.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-500 dark:text-slate-400">Loading…</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
