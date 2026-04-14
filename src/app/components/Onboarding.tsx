import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowLeft, Car, Bike, Truck, Camera, Check, User, GraduationCap, Clock } from "lucide-react";
import { useColors } from "./ThemeContext";

const COURSES = [
  "Smart Product Engineering",
  "Computer Science",
  "Software Development",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Business Information Systems",
  "Biomedical Engineering",
  "Civil Engineering",
  "Architecture",
  "Accounting & Finance",
  "Marketing & Management",
  "Other",
];

const VEHICLES = [
  { id: "car", icon: Car, label: "Car", desc: "Saloon, hatchback, SUV" },
  { id: "motorbike", icon: Bike, label: "Motorbike", desc: "Motorcycle, scooter" },
  { id: "van", icon: Truck, label: "Van", desc: "Van, truck" },
];

const TIME_OPTIONS = [
  "7:00 AM", "7:15 AM", "7:30 AM", "7:45 AM",
  "8:00 AM", "8:15 AM", "8:30 AM", "8:45 AM",
  "9:00 AM", "9:15 AM", "9:30 AM", "9:45 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM",
];

const STEPS = ["Profile", "Course", "Vehicle", "Arrival", "Done"];

export default function Onboarding() {
  const navigate = useNavigate();
  const c = useColors();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [course, setCourse] = useState("");
  const [vehicle, setVehicle] = useState("car");
  const [arrivalIdx, setArrivalIdx] = useState(6);
  const [photoUrl, setPhotoUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canNext = () => {
    if (step === 1) return course.length > 0;
    return true;
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const finish = () => {
    const storedUsername = localStorage.getItem("skyspot_username") || "User";
    const fName = firstName.trim() || storedUsername;
    const lName = lastName.trim();
    const initials = lName ? `${fName.charAt(0)}${lName.charAt(0)}`.toUpperCase() : fName.charAt(0).toUpperCase();
    const userData = {
      firstName: fName,
      lastName: lName,
      initials,
      course,
      vehicle,
      arrivalTime: TIME_OPTIONS[arrivalIdx],
      arrivalIdx,
      photo: photoUrl || "",
    };
    localStorage.setItem("skyspot_user", JSON.stringify(userData));
    localStorage.setItem("skyspot_logged_in", "true");
    navigate("/app");
  };

  const next = () => { if (step < 4) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const inputStyle: React.CSSProperties = {
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    color: c.text,
  };

  const initials = `${firstName.charAt(0) || ""}${lastName.charAt(0) || ""}`.toUpperCase();

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-12" style={{ background: c.bgGrad, fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {step > 0 && step < 4 ? (
            <button onClick={prev} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}>
              <ArrowLeft size={16} color={c.textSecondary} />
            </button>
          ) : <div className="w-9" />}
          <div className="flex gap-1.5">
            {STEPS.slice(0, 4).map((_, i) => (
              <div key={i} className="h-1 rounded-full transition-all duration-300"
                style={{ width: step >= i ? 28 : 12, background: step >= i ? "#2D7EFF" : c.cardBorder }} />
            ))}
          </div>
          <button onClick={() => { if (step < 4) next(); }} className="text-[12px]" style={{ color: c.textFaint, visibility: step >= 3 ? "hidden" : "visible" }}>
            Skip
          </button>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 lg:p-8" style={{ background: c.card, border: `1px solid ${c.cardBorder}`, backdropFilter: "blur(20px)" }}>
          <AnimatePresence mode="wait">
            {/* Step 0: Profile */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-2 mb-1">
                  <User size={18} color={c.accent} />
                  <h2 style={{ color: c.text, fontSize: 22, fontWeight: 700 }}>Your Profile</h2>
                </div>
                <p style={{ color: c.textMuted, fontSize: 13 }} className="mb-6">Let's get to know you.</p>

                {/* Photo upload */}
                <div className="flex flex-col items-center mb-6">
                  <button onClick={() => fileRef.current?.click()}
                    className="w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden mb-2"
                    style={{ background: photoUrl ? "transparent" : "linear-gradient(135deg, #2D7EFF, #1B5FCC)", border: `3px solid ${c.accent}40` }}>
                    {photoUrl ? (
                      <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : initials ? (
                      <span className="text-white" style={{ fontSize: 32, fontWeight: 700 }}>{initials}</span>
                    ) : (
                      <Camera size={28} color="white" />
                    )}
                    <div className="absolute bottom-0 inset-x-0 py-1 text-center text-[9px] text-white"
                      style={{ background: "rgba(0,0,0,0.6)" }}>
                      {photoUrl ? "Change" : "Add Photo"}
                    </div>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  <span style={{ color: c.textFaint }} className="text-[11px]">Optional</span>
                </div>

                <label className="text-[11px] mb-1.5 uppercase tracking-wider block" style={{ color: c.textMuted }}>First Name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full py-3.5 px-4 rounded-xl text-[14px] outline-none mb-4 focus:ring-1 focus:ring-[#2D7EFF]"
                  style={inputStyle} />

                <label className="text-[11px] mb-1.5 uppercase tracking-wider block" style={{ color: c.textMuted }}>Last Name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full py-3.5 px-4 rounded-xl text-[14px] outline-none mb-4 focus:ring-1 focus:ring-[#2D7EFF]"
                  style={inputStyle} />
              </motion.div>
            )}

            {/* Step 1: Course */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap size={18} color={c.accent} />
                  <h2 style={{ color: c.text, fontSize: 22, fontWeight: 700 }}>Your Course</h2>
                </div>
                <p style={{ color: c.textMuted, fontSize: 13 }} className="mb-5">Select your programme at MTU.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pb-2">
                  {COURSES.map((c_name) => (
                    <button key={c_name} onClick={() => setCourse(c_name)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left"
                      style={{
                        background: course === c_name ? c.accentBg : c.inputBg,
                        border: `1px solid ${course === c_name ? c.accentBorder : c.cardBorder}`,
                      }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: course === c_name ? "#2D7EFF" : "transparent",
                          border: `2px solid ${course === c_name ? "#2D7EFF" : c.inputBorder}`,
                        }}>
                        {course === c_name && <Check size={12} color="white" />}
                      </div>
                      <span className="text-[13px]" style={{ color: course === c_name ? c.accent : c.textSecondary, fontWeight: course === c_name ? 600 : 400 }}>
                        {c_name}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Vehicle */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-2 mb-1">
                  <Car size={18} color={c.accent} />
                  <h2 style={{ color: c.text, fontSize: 22, fontWeight: 700 }}>Your Vehicle</h2>
                </div>
                <p style={{ color: c.textMuted, fontSize: 13 }} className="mb-6">What do you drive to campus?</p>

                <div className="space-y-3">
                  {VEHICLES.map((v) => (
                    <button key={v.id} onClick={() => setVehicle(v.id)}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl transition-colors"
                      style={{
                        background: vehicle === v.id ? c.accentBg : c.inputBg,
                        border: `1.5px solid ${vehicle === v.id ? c.accentBorder : c.cardBorder}`,
                      }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: vehicle === v.id ? "rgba(45,126,255,0.15)" : c.card }}>
                        <v.icon size={24} color={vehicle === v.id ? "#2D7EFF" : c.textFaint} />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-[14px]" style={{ color: vehicle === v.id ? c.accent : c.text, fontWeight: 600 }}>{v.label}</div>
                        <div className="text-[11px]" style={{ color: c.textMuted }}>{v.desc}</div>
                      </div>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: vehicle === v.id ? "#2D7EFF" : "transparent",
                          border: `2px solid ${vehicle === v.id ? "#2D7EFF" : c.inputBorder}`,
                        }}>
                        {vehicle === v.id && <Check size={12} color="white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Arrival */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={18} color={c.accent} />
                  <h2 style={{ color: c.text, fontSize: 22, fontWeight: 700 }}>Arrival Time</h2>
                </div>
                <p style={{ color: c.textMuted, fontSize: 13 }} className="mb-8">When do you usually get to campus?</p>

                <div className="p-6 rounded-2xl mb-6" style={{ background: c.inputBg, border: `1px solid ${c.cardBorder}` }}>
                  <div className="text-center mb-6">
                    <span style={{ color: c.accent, fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>{TIME_OPTIONS[arrivalIdx]}</span>
                    <p className="mt-1 text-[11px]" style={{ color: c.textMuted }}>Drag to set your typical arrival</p>
                  </div>
                  <input type="range" min={0} max={TIME_OPTIONS.length - 1} value={arrivalIdx}
                    onChange={(e) => setArrivalIdx(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #2D7EFF ${(arrivalIdx / (TIME_OPTIONS.length - 1)) * 100}%, ${c.cardBorder} ${(arrivalIdx / (TIME_OPTIONS.length - 1)) * 100}%)`,
                      accentColor: "#2D7EFF",
                    }} />
                  <div className="flex justify-between mt-2">
                    <span style={{ color: c.textFaint }} className="text-[10px]">7:00 AM</span>
                    <span style={{ color: c.textFaint }} className="text-[10px]">5:00 PM</span>
                  </div>
                </div>

                {/* Prediction card */}
                <div className="p-4 rounded-2xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.15)" }}>
                      <Check size={16} color="#22C55E" />
                    </div>
                    <div>
                      <p className="text-[12px]" style={{ color: "#22C55E", fontWeight: 600 }}>Smart Alerts</p>
                      <p className="text-[11px] mt-0.5" style={{ color: c.textMuted }}>
                        We'll notify you at {arrivalIdx > 0 ? TIME_OPTIONS[arrivalIdx - 1] : TIME_OPTIONS[0]} with a live availability prediction for your {TIME_OPTIONS[arrivalIdx]} arrival.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Done */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center text-center py-8">
                <motion.div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                  style={{ background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)" }}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.15 }}>
                  <Check size={36} color="#22C55E" />
                </motion.div>
                <h2 style={{ color: c.text, fontSize: 24, fontWeight: 700 }} className="mb-2">
                  You're all set, {firstName || localStorage.getItem("skyspot_username") || "there"}!
                </h2>
                <p style={{ color: c.textMuted, fontSize: 13 }} className="mb-2">
                  Your profile is ready. SkySpot will give you personalised parking predictions based on your schedule.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <span className="px-3 py-1.5 rounded-full text-[11px]" style={{ background: c.accentBg, color: c.accent, border: `1px solid ${c.accentBorder}` }}>
                    {course}
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-[11px]" style={{ background: c.inputBg, color: c.textSecondary, border: `1px solid ${c.cardBorder}` }}>
                    {VEHICLES.find((v) => v.id === vehicle)?.label}
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-[11px]" style={{ background: c.inputBg, color: c.textSecondary, border: `1px solid ${c.cardBorder}` }}>
                    {TIME_OPTIONS[arrivalIdx]}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom button */}
          <div className="pt-6">
            <motion.button
              onClick={() => { step === 4 ? finish() : next(); }}
              disabled={!canNext()}
              className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2 transition-all"
              style={{
                background: canNext() ? "linear-gradient(135deg, #2D7EFF, #1B5FCC)" : c.cardBorder,
                fontSize: 15,
                fontWeight: 600,
                opacity: canNext() ? 1 : 0.5,
              }}
              whileTap={canNext() ? { scale: 0.97 } : {}}>
              {step === 4 ? "Start Parking Smarter" : "Continue"}
              <ArrowRight size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
