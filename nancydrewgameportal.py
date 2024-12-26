# 
#
# Nancy Drew Game Portal
# Developed By Gus Jacobs
# Date:12/16/2024 - 12/24/2024
#
#
import os
import tkinter as tk
from tkinter import filedialog, messagebox
from tkinter import ttk
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from PIL import Image, ImageTk
from random import choice

# Global root directory for games
root_directory = "C:/nd"

def configure_styles():
 style = ttk.Style()
 style.theme_use("default")  # Ensure a baseline theme is applied
 style.configure("Custom.TButton", background="#556B78", foreground="#D3D3D3", font=("Helvetica", 10))
 style.map(
  "Custom.TButton",
  background=[("active", "#708090"), ("pressed", "#4C5B64")],  # Hover and pressed colors
  foreground=[("active", "#FFFFFF"), ("pressed", "#D3D3D3")],
  )

# Function to ensure root directory exists
def ensure_root_directory():
 if not os.path.exists(root_directory):
  os.makedirs(root_directory)

# Function to quit application
def quit_app():
 root.destroy()

# Function to handle adding a new directory
def add_directory():
 folder = filedialog.askdirectory(title="Select a folder to add")
 if folder:
  destination = os.path.join(root_directory, os.path.basename(folder))
  if not os.path.exists(destination):
   os.makedirs(destination)
   messagebox.showinfo("Success", f"Added {os.path.basename(folder)} to root directory.")
  else:
   messagebox.showerror("Error", "Directory already exists.")

# Function to remove a directory
def remove_directory():
 folder = filedialog.askdirectory(initialdir=root_directory, title="Select a folder to remove")
 if folder and folder.startswith(root_directory):
  os.rmdir(folder)
  messagebox.showinfo("Success", f"Removed {os.path.basename(folder)} from root directory.")
 else:
  messagebox.showerror("Error", "Invalid folder selection.")

# Function to edit existing directories
def edit_directory():
 filedialog.askdirectory(initialdir=root_directory, title="Select a directory to edit")

# Function to contact developers
def contact_developer():
 def send_email():
  try:
   sender_email = "nancydrewportal@gmail.com"
   sender_password = "nancydrewgameportal24"
   recipient_email = "bumblebees480@gmail.com"
   subject = "Contact from Nancy Drew Game Portal"
   body = text_entry.get("1.0", tk.END).strip()
   msg = MIMEMultipart()
   msg["From"] = sender_email
   msg["To"] = recipient_email
   msg["Subject"] = subject
   msg.attach(MIMEText(body, "plain"))
   server = smtplib.SMTP("smtp.gmail.com", 587)
   server.starttls()
   server.login(sender_email, sender_password)
   server.sendmail(sender_email, recipient_email, msg.as_string())
   server.quit()
   messagebox.showinfo("Success", "Message sent successfully.")
   contact_window.destroy()
  except Exception as e:
   messagebox.showerror("Error", f"Failed to send message: {str(e)}")
 contact_window = tk.Toplevel(root)
 contact_window.title("Contact Developer")
 tk.Label(contact_window, text="Enter your message:", font="Helvetica").pack(pady=5)
 text_entry = tk.Text(contact_window, height=10, width=40, font="Helvetica")
 text_entry.pack(pady=5)
 ttk.Button(contact_window, text="Send", style="Custom.TButton", command=send_email).pack(pady=5)

# Function to launch a game
def launch_game(game_folder):
 game_file = os.path.join(game_folder, "game_launcher.exe")
 if os.path.exists(game_file):
  os.system(f'"{game_file}"')
 else:
  messagebox.showerror("Error", "Game file not found.")

# Frame: Developer options
def developer_frame():
 clear_frame()
 tk.Label(root, text="Developer Options", font=("Helvetica", 14)).pack(pady=10)
 ttk.Button(root, text="Add New Directory", style="Custom.TButton", command=add_directory).pack(pady=5)
 ttk.Button(root, text="Remove Directory", style="Custom.TButton", command=remove_directory).pack(pady=5)
 ttk.Button(root, text="Edit Existing Directory", style="Custom.TButton", command=edit_directory).pack(pady=5)
 ttk.Button(root, text="Back", style="Custom.TButton", command=main_menu).pack(pady=5)

# Frame: Player options
def player_frame():
 clear_frame()
 # Create main frame for the player view
 main_frame = ttk.Frame(root, style="Custom.TFrame")
 main_frame.grid(row=0, column=0, sticky="nsew")
 # Create a header frame
 header_frame = tk.Frame(main_frame, bg="#2C2F33")
 header_frame.grid(row=0, column=0, columnspan=2, sticky="ew")
 header_label = tk.Label(
 header_frame, text="Nancy Drew Game Portal",
  font=("Helvetica", 16), bg="#2C2F33", fg="#D3D3D3"
 )
 header_label.pack(pady=10)
 # Add "Contact Developer" button in the header
 contact_button = ttk.Button(
  header_frame, text="Contact Developer", style="Custom.TButton", command=contact_developer
 )
 contact_button.pack(pady=5)
 # Create scrollable area for games
 canvas = tk.Canvas(main_frame, bg="#2C2F33", highlightthickness=0)
 scrollbar = ttk.Scrollbar(main_frame, orient="vertical", command=canvas.yview)
 scrollable_frame = ttk.Frame(canvas)
 scrollable_frame.bind(
  "<Configure>",
  lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
 )
 canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
 canvas.configure(yscrollcommand=scrollbar.set)
 # Enable mouse wheel scrolling
 def on_mouse_wheel(event):
  canvas.yview_scroll(-1 * int(event.delta / 120), "units")
 canvas.bind_all("<MouseWheel>", on_mouse_wheel)
 # Place the canvas and scrollbar
 canvas.grid(row=1, column=0, sticky="nsew")
 scrollbar.grid(row=1, column=1, sticky="ns")
 # Populate games
 game_colors = ["#3B4C6B", "#3F6654", "#5C3C3D", "#4C3A60", "#8C5B32"]
 game_frames = []  # Store references to game frames for resizing
 for folder in os.listdir(root_directory):
  game_folder = os.path.join(root_directory, folder)
  if os.path.isdir(game_folder):
   bg_color = choice(game_colors)
   game_frame = tk.Frame(scrollable_frame, bg=bg_color, borderwidth=2, relief="ridge")
   game_frame.pack(fill="x", pady=5, padx=10)
   game_frames.append(game_frame)
   # Add game image
   image_path = os.path.join(game_folder, "cover.jpg")
   if os.path.exists(image_path):
    img = Image.open(image_path)
    img.thumbnail((100, 100))
    img = ImageTk.PhotoImage(img)
    lbl_image = tk.Label(game_frame, image=img, bg=bg_color)
    lbl_image.image = img
    lbl_image.pack(side="left", padx=10)
   # Add game title
   game_title = tk.Label(
    game_frame, text=folder, font=("Helvetica", 12),
    bg=bg_color, fg="#D3D3D3"
   )
   game_title.pack(side="left", padx=10, fill="x", expand=True)
   # Add play button
   play_button = ttk.Button(
   game_frame, text="Play", style="Custom.TButton",
    command=lambda g=game_folder: launch_game(g)
   )
   play_button.pack(side="right", padx=10)
 # Configure resizing behavior
 root.grid_rowconfigure(0, weight=1)
 root.grid_columnconfigure(0, weight=1)
 main_frame.grid_rowconfigure(1, weight=1)
 main_frame.grid_columnconfigure(0, weight=1)
 # Adjust game frames dynamically
 # Dynamic resizing
 def on_resize(event):
  canvas_width = event.width
  for game_frame in game_frames:
   game_frame.config(width=canvas_width)
 canvas.bind("<Configure>", on_resize)

# Main menu frame
def main_menu():
 clear_frame()
 tk.Label(root, text="Nancy Drew Game Portal", font=("Helvetica", 16)).pack(pady=10)
 ttk.Button(root, text="Player", style="Custom.TButton", command=player_frame).pack(pady=5)
 ttk.Button(root, text="Developer", style="Custom.TButton", command=developer_frame).pack(pady=5)
 ttk.Button(root, text="Quit", style="Custom.TButton", command=quit_app).pack(pady=5)

# Clear current frame
def clear_frame():
 for widget in root.winfo_children():
  widget.destroy()

# Main application setup
root = tk.Tk()
configure_styles()
root.title("Nancy Drew Game Portal")
root.geometry("400x300")
ensure_root_directory()
main_menu()
root.mainloop()
