from setuptools import setup, find_packages

setup(
    name="store_app",
    version="0.0.1",
    description="ERPNext Store App — online ordering system for customers",
    author="Store App Developer",
    author_email="dev@example.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=[],
    package_data={
        "store_app": [
            "public/css/*.css",
            "public/js/*.js",
            "public/*.html",
            "www/*.html",
            "www/*.py",
            "www/**/*.html",
            "www/**/*.py",
            "templates/**/*.html",
            "store_app/doctype/**/*.json",
            "store_app/doctype/**/*.py",
            "store_app/fixtures/*.py",
            "store_app/fixtures/**/*.py",
            "modules.txt",
            "patches.txt",
            "hooks.py",
        ]
    },
)
