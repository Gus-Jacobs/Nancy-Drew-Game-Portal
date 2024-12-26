import os
import subprocess

def launch_game():
 game_file = "Twister.exe"  # Replace with actual game file
 game_path = os.path.join("C:/nd/Trail of the Twister", game_file)
 if os.path.exists(game_path):
  subprocess.Popen(game_path, shell=True)
 else:
  print(f"Game file '{game_file}' not found.")

if __name__ == "__main__":
 launch_game()
