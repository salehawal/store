from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

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
            "templates/*",
            "templates/**/*",
            "store_app/doctype/*/*.json",
            "store_app/doctype/*/*.js",
            "store_app/doctype/*/*.css",
            "store_app/fixtures/*",
        ]
    },
    install_requires=install_requires,
    python_requires=">=3.10",
    zip_safe=False,
)
