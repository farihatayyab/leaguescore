// Client aur server dono use kar sakte hain (koi server import nahi)
export const homeFor = (role) => (role === "admin" ? "/admin" : "/dashboard");
