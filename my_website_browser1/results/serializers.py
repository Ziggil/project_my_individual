from rest_framework import serializers
from .models import Result


class UserResultSummarySerializer(serializers.ModelSerializer):
    quiz_name = serializers.CharField(source='quiz.name', read_only=True)
    pass_score = serializers.IntegerField(source='quiz.required_score_pass', read_only=True)
    passed = serializers.SerializerMethodField()
    score_percent = serializers.FloatField(source='score', read_only=True)

    class Meta:
        model = Result
        fields = ['quiz_name', 'score_percent', 'pass_score', 'passed']

    def get_passed(self, obj):
        return obj.score >= obj.quiz.required_score_pass