// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'match_list_view_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#custom-getters-and-methods');

/// @nodoc
mixin _$MatchListViewState {
  Object? get error => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $MatchListViewStateCopyWith<MatchListViewState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MatchListViewStateCopyWith<$Res> {
  factory $MatchListViewStateCopyWith(
          MatchListViewState value, $Res Function(MatchListViewState) then) =
      _$MatchListViewStateCopyWithImpl<$Res, MatchListViewState>;
  @useResult
  $Res call({Object? error});
}

/// @nodoc
class _$MatchListViewStateCopyWithImpl<$Res, $Val extends MatchListViewState>
    implements $MatchListViewStateCopyWith<$Res> {
  _$MatchListViewStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? error = freezed,
  }) {
    return _then(_value.copyWith(
      error: freezed == error ? _value.error : error,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$MatchListViewStateImplCopyWith<$Res>
    implements $MatchListViewStateCopyWith<$Res> {
  factory _$$MatchListViewStateImplCopyWith(_$MatchListViewStateImpl value,
          $Res Function(_$MatchListViewStateImpl) then) =
      __$$MatchListViewStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({Object? error});
}

/// @nodoc
class __$$MatchListViewStateImplCopyWithImpl<$Res>
    extends _$MatchListViewStateCopyWithImpl<$Res, _$MatchListViewStateImpl>
    implements _$$MatchListViewStateImplCopyWith<$Res> {
  __$$MatchListViewStateImplCopyWithImpl(_$MatchListViewStateImpl _value,
      $Res Function(_$MatchListViewStateImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? error = freezed,
  }) {
    return _then(_$MatchListViewStateImpl(
      error: freezed == error ? _value.error : error,
    ));
  }
}

/// @nodoc

class _$MatchListViewStateImpl implements _MatchListViewState {
  const _$MatchListViewStateImpl({this.error});

  @override
  final Object? error;

  @override
  String toString() {
    return 'MatchListViewState(error: $error)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MatchListViewStateImpl &&
            const DeepCollectionEquality().equals(other.error, error));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(error));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MatchListViewStateImplCopyWith<_$MatchListViewStateImpl> get copyWith =>
      __$$MatchListViewStateImplCopyWithImpl<_$MatchListViewStateImpl>(
          this, _$identity);
}

abstract class _MatchListViewState implements MatchListViewState {
  const factory _MatchListViewState({final Object? error}) =
      _$MatchListViewStateImpl;

  @override
  Object? get error;
  @override
  @JsonKey(ignore: true)
  _$$MatchListViewStateImplCopyWith<_$MatchListViewStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
