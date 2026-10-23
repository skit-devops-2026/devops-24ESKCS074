pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

 atulya
        stage('Install') {
            steps {
                bat 'echo PetPal has no external dependencies'
            }
        }

        stage('Test') {
            steps {
                bat 'node --test tests\\server.test.js'
            }
        }

        stage('Build') {
            steps {
                bat 'node --check pages\\Chaitanya\\server.js'
            }

        stage('Test') {
            steps {
                bat 'npm test'
            }
        }

        stage('Docker Build') {
            steps {
                bat 'docker build -t petpal:latest .'
            }
        }
    }

    post {
        success {
            echo 'PetPal pipeline completed successfully.'
        }
        failure {
            echo 'PetPal pipeline failed. Check the stage logs.'
 main
        }
    }
}