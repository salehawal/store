from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = [l for l in f.read().splitlines() if l and not l.startswith("#")]

setup(
    name="store",
    version="0.0.1",
    description="ERPNext Store App — online ordering at /store",
    author="Store",
    packages=find_packages(),
    include_package_data=True,
    package_data={
        "store": [
            "public/*",
            "public/**/*",
            "www/*",
            "www/**/*",
            "setup/*",
            "api/*",
            "demo_data/*",
            "demo_data/**/*",
        ]
    },
    install_requires=install_requires,
    python_requires=">=3.10",
    zip_safe=False,
)
