import os

# Some developer shells use DEBUG=release; these services require a boolean.
os.environ["DEBUG"] = "false"
