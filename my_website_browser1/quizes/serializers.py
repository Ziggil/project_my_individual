from rest_framework import serializers
from .models import Quiz
from questions.models import Question, Answer


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['text']


class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True, source='answer_set')

    class Meta:
        model = Question
        fields = ['text', 'answers']


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True, source='question_set')

    class Meta:
        model = Quiz
        fields = ['name', 'topic', 'time', 'questions']


class QuizSubmissionSerializer(serializers.Serializer):
    answers = serializers.DictField()
    
    def validate_answers(self, value):
        for question_text in value:
            if not Question.objects.filter(text=question_text).exists():
                raise serializers.ValidationError(f"Вопрос '{question_text}' не найден")
        return value